import { Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CONFIG_PDA, PROGRAM_ID, VAULT_PDA, closePositionIx, openPositionIx, positionAddress } from "./program";

const idl = JSON.parse(readFileSync(join(__dirname, "../../anchor/idl/line_futures.json"), "utf8"));

describe("program accounts", () => {
  it("program id matches the IDL", () => expect(PROGRAM_ID.toBase58()).toBe(idl.address));

  it("PDAs match the ones created on devnet", () => {
    expect(CONFIG_PDA.toBase58()).toBe("GrxbTxVdPjKHVUS3cDdzw7BXNynGzxk17DKani7mmSLF");
    expect(VAULT_PDA.toBase58()).toBe("5kZ5XRtW2ueQCojzrs41J2f8U8eQEvtQbbUhjEz55y4o");
  });

  it("account order matches the IDL for open and close", () => {
    const user = Keypair.generate().publicKey;
    const open = openPositionIx({ user, nonce: 5n, amount: 10_000_000n, leverage: 10, commitment: new Uint8Array(32).fill(1), slot: 0 });
    const idlOpen = idl.instructions.find((i: any) => i.name === "open_position").accounts;
    expect(open.keys.length).toBe(idlOpen.length);
    idlOpen.forEach((a: any, i: number) => {
      expect(!!a.signer).toBe(open.keys[i].isSigner);
      expect(!!a.writable).toBe(open.keys[i].isWritable);
    });
    expect(open.keys[2].pubkey.equals(positionAddress(user, 5n))).toBe(true);

    const close = closePositionIx({ settler: Keypair.generate().publicKey, position: positionAddress(user, 5n), user, pnl: 1n, actualCommitment: new Uint8Array(32).fill(2) });
    const idlClose = idl.instructions.find((i: any) => i.name === "close_position").accounts;
    expect(close.keys.length).toBe(idlClose.length);
    idlClose.forEach((a: any, i: number) => {
      expect(!!a.signer).toBe(close.keys[i].isSigner);
      expect(!!a.writable).toBe(close.keys[i].isWritable);
    });
  });

  it("different nonces give different positions", () => {
    const user = new PublicKey("7SzDAkBB5NK5DKTJQQ8AWTyWNpaQ7QZoF1bgJyxtAAKh");
    expect(positionAddress(user, 1n).equals(positionAddress(user, 2n))).toBe(false);
  });
});
