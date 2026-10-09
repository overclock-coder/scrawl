import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createHash } from "crypto";
import { assert } from "chai";
import { readFileSync } from "fs";
import { join } from "path";

const idl = JSON.parse(readFileSync(join(process.cwd(), "idl", "line_futures.json"), "utf8"));

const base = anchor.AnchorProvider.env();
const provider = new anchor.AnchorProvider(base.connection, base.wallet, { commitment: "confirmed", preflightCommitment: "confirmed" });
anchor.setProvider(provider);
const program = new Program(idl as anchor.Idl, provider);
const conn = provider.connection;
const authority = (provider.wallet as anchor.Wallet).payer;

const pda = (seeds: (Buffer | Uint8Array)[]) => PublicKey.findProgramAddressSync(seeds, program.programId)[0];
const configPda = pda([Buffer.from("config")]);
const vaultPda = pda([Buffer.from("vault")]);
const positionPda = (user: PublicKey, nonce: number) =>
  pda([Buffer.from("position"), user.toBuffer(), new BN(nonce).toArrayLike(Buffer, "le", 8)]);
const sha = (s: string) => Array.from(createHash("sha256").update(s).digest());
const sol = (n: number) => new BN(Math.round(n * LAMPORTS_PER_SOL));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bal = (k: PublicKey) => conn.getBalance(k, "confirmed");

async function fund(k: PublicKey, n = 10) {
  const sig = await conn.requestAirdrop(k, n * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
}

/** Resolves true if `p` rejects with an error naming `code` (an Anchor error name). */
async function rejects(p: Promise<unknown>, code: string) {
  try {
    await p;
  } catch (e: any) {
    const text = `${e?.error?.errorCode?.code ?? ""} ${e?.message ?? ""} ${(e?.logs ?? []).join(" ")}`;
    assert.include(text, code, `expected ${code}, got: ${text.slice(0, 300)}`);
    return;
  }
  assert.fail(`expected ${code} but the call succeeded`);
}

const open = (user: Keypair, nonce: number, amount: BN, leverage: number, commit: number[], slot = 0) =>
  program.methods
    .openPosition(new BN(nonce), amount, leverage, commit, slot)
    .accounts({ config: configPda, vault: vaultPda, position: positionPda(user.publicKey, nonce), user: user.publicKey, systemProgram: SystemProgram.programId })
    .signers([user]);

const close = (settler: Keypair, user: PublicKey, nonce: number, pnl: BN, commit: number[], userAccount = user) =>
  program.methods
    .closePosition(pnl, commit)
    .accounts({ config: configPda, vault: vaultPda, position: positionPda(user, nonce), user: userAccount, settler: settler.publicKey, systemProgram: SystemProgram.programId })
    .signers([settler]);

const admin = { config: configPda, authority: authority.publicKey };

describe("line_futures", () => {
  const settler = Keypair.generate();
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  const rando = Keypair.generate();
  const commit = sha("drawing");
  const actual = sha("prices");

  before(async () => {
    await Promise.all([settler, alice, bob, rando].map((k) => fund(k.publicKey)));
  });

  it("initializes config and funds the vault with rent", async () => {
    await program.methods
      .initialize(settler.publicKey, 200)
      .accounts({ config: configPda, vault: vaultPda, authority: authority.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
    const cfg: any = await (program.account as any).config.fetch(configPda);
    assert.equal(cfg.feeBps, 200);
    assert.isFalse(cfg.paused);
    assert.equal(cfg.settler.toBase58(), settler.publicKey.toBase58());
    assert.isAbove(await bal(vaultPda), 0);
  });

  it("rejects bad open_position inputs", async () => {
    await rejects(open(alice, 900, sol(0.001), 10, commit).rpc(), "AmountBelowMinimum");
    await rejects(open(alice, 901, sol(1), 0, commit).rpc(), "InvalidLeverage");
    await rejects(open(alice, 902, sol(1), 101, commit).rpc(), "InvalidLeverage");
    await rejects(open(alice, 903, sol(1), 10, new Array(32).fill(0)).rpc(), "EmptyCommitment");
    await rejects(open(alice, 904, sol(1), 10, commit, 5).rpc(), "InvalidSlot");
  });

  it("escrows stake and records the position", async () => {
    const before = await bal(vaultPda);
    await open(alice, 1, sol(1), 10, commit).rpc();
    assert.equal((await bal(vaultPda)) - before, LAMPORTS_PER_SOL);
    const p: any = await (program.account as any).position.fetch(positionPda(alice.publicKey, 1));
    assert.isTrue(p.isOpen);
    assert.equal(p.leverage, 10);
    assert.equal(p.amount.toString(), sol(1).toString());
    assert.deepEqual(Array.from(p.predictionCommitment), commit);
  });

  it("a batch is several staggered positions in one transaction", async () => {
    const ixs = await Promise.all([0, 1, 2].map((i) => open(bob, 10 + i, sol(0.5), 5, sha(`d${i}`), i).instruction()));
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(...ixs), [bob]);
    const ps: any[] = await Promise.all([0, 1, 2].map((i) => (program.account as any).position.fetch(positionPda(bob.publicKey, 10 + i))));
    assert.equal(ps[1].openTimestamp.toNumber() - ps[0].openTimestamp.toNumber(), 60);
    assert.equal(ps[2].openTimestamp.toNumber() - ps[0].openTimestamp.toNumber(), 120);
  });

  it("cannot reuse a nonce", async () => {
    let failed = false;
    try { await open(alice, 1, sol(1), 10, commit).rpc(); } catch { failed = true; }
    assert.isTrue(failed);
  });

  it("will not settle before the 60s window", async () => {
    await rejects(close(settler, alice.publicKey, 1, new BN(0), actual).rpc(), "NotYetClosable");
  });

  describe("settlement (after the window)", () => {
    before(async () => {
      await open(rando, 1, sol(1), 10, commit).rpc(); // will lose everything
      await open(rando, 2, sol(1), 10, commit).rpc(); // will lose half
      await open(rando, 3, sol(1), 10, commit).rpc(); // for bound checks
      console.log("      waiting 62s for the 60s window to elapse...");
      await sleep(62_000);
    });

    it("only the settler can close, and only to the owner", async () => {
      await rejects(close(rando, alice.publicKey, 1, new BN(0), actual).rpc(), "NotSettler");
      await rejects(close(settler, alice.publicKey, 1, new BN(0), actual, bob.publicKey).rpc(), "WrongUser");
      await rejects(close(settler, alice.publicKey, 1, new BN(0), new Array(32).fill(0)).rpc(), "EmptyCommitment");
    });

    it("bounds pnl to [-stake, stake*leverage]", async () => {
      await rejects(close(settler, rando.publicKey, 3, sol(1).neg().sub(new BN(1)), actual).rpc(), "PnlOutOfBounds");
      await rejects(close(settler, rando.publicKey, 3, sol(10).add(new BN(1)), actual).rpc(), "PnlOutOfBounds");
    });

    it("pays stake + profit - 2% fee on a win", async () => {
      const before = await bal(alice.publicKey);
      const feesBefore = ((await (program.account as any).config.fetch(configPda)) as any).collectedFees as BN;
      const pnl = sol(0.1);
      await close(settler, alice.publicKey, 1, pnl, actual).rpc();
      const fee = pnl.muln(200).divn(10_000);
      assert.equal((await bal(alice.publicKey)) - before, sol(1).add(pnl).sub(fee).toNumber());
      const cfg: any = await (program.account as any).config.fetch(configPda);
      assert.equal(cfg.collectedFees.sub(feesBefore).toString(), fee.toString());
      const p: any = await (program.account as any).position.fetch(positionPda(alice.publicKey, 1));
      assert.isFalse(p.isOpen);
      assert.equal(p.pnl.toString(), pnl.toString());
    });

    it("a total loss pays nothing and leaves the stake in the vault", async () => {
      const userBefore = await bal(rando.publicKey);
      const vaultBefore = await bal(vaultPda);
      await close(settler, rando.publicKey, 1, sol(1).neg(), actual).rpc();
      assert.equal(await bal(rando.publicKey), userBefore);
      assert.equal(await bal(vaultPda), vaultBefore);
    });

    it("a partial loss refunds the remainder, with no fee", async () => {
      const before = await bal(rando.publicKey);
      const feesBefore = ((await (program.account as any).config.fetch(configPda)) as any).collectedFees as BN;
      await close(settler, rando.publicKey, 2, sol(0.4).neg(), actual).rpc();
      assert.equal((await bal(rando.publicKey)) - before, sol(0.6).toNumber());
      const cfg: any = await (program.account as any).config.fetch(configPda);
      assert.equal(cfg.collectedFees.toString(), feesBefore.toString());
    });

    it("cannot close twice", async () => {
      await rejects(close(settler, alice.publicKey, 1, new BN(0), actual).rpc(), "AlreadyClosed");
    });

    it("a later slot in a batch is still locked", async () => {
      await rejects(close(settler, bob.publicKey, 12, new BN(0), actual).rpc(), "NotYetClosable");
    });
  });

  describe("admin", () => {
    it("rejects non-authority callers", async () => {
      await rejects(program.methods.setFeeBps(100).accounts({ config: configPda, authority: rando.publicKey }).signers([rando]).rpc(), "NotAuthority");
      await rejects(program.methods.setPaused(true).accounts({ config: configPda, authority: rando.publicKey }).signers([rando]).rpc(), "NotAuthority");
    });

    it("caps the fee at 10% and rejects a zero settler", async () => {
      await rejects(program.methods.setFeeBps(1001).accounts(admin).rpc(), "FeeTooHigh");
      await rejects(program.methods.setSettler(PublicKey.default).accounts(admin).rpc(), "ZeroAddress");
    });

    it("pausing blocks new positions; unpausing restores them", async () => {
      await program.methods.setPaused(true).accounts(admin).rpc();
      await rejects(open(alice, 50, sol(1), 10, commit).rpc(), "Paused");
      await program.methods.setPaused(false).accounts(admin).rpc();
      await open(alice, 50, sol(1), 10, commit).rpc();
    });

    it("withdraws collected fees, but no more than collected", async () => {
      const cfg: any = await (program.account as any).config.fetch(configPda);
      const fees: BN = cfg.collectedFees;
      assert.isTrue(fees.gtn(0));
      const accts = { config: configPda, vault: vaultPda, authority: authority.publicKey, systemProgram: SystemProgram.programId };
      await rejects(program.methods.withdrawFees(fees.addn(1)).accounts(accts).rpc(), "InsufficientFees");
      const before = await bal(authority.publicKey);
      await program.methods.withdrawFees(fees).accounts(accts).rpc();
      assert.isAbove(await bal(authority.publicKey), before);
      const after: any = await (program.account as any).config.fetch(configPda);
      assert.equal(after.collectedFees.toNumber(), 0);
    });

    it("emergency withdraw leaves the vault rent-exempt", async () => {
      const accts = { config: configPda, vault: vaultPda, authority: authority.publicKey, systemProgram: SystemProgram.programId };
      await program.methods.emergencyWithdraw().accounts(accts).rpc();
      const rent = await conn.getMinimumBalanceForRentExemption(0);
      assert.equal(await bal(vaultPda), rent);
    });

    it("can rotate the settler", async () => {
      const next = Keypair.generate();
      await program.methods.setSettler(next.publicKey).accounts(admin).rpc();
      const cfg: any = await (program.account as any).config.fetch(configPda);
      assert.equal(cfg.settler.toBase58(), next.publicKey.toBase58());
    });
  });
});
