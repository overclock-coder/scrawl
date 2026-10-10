// Stake without registering a drawing, then wait for the settler's sweep to refund it.
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { commitmentBytes, decodePosition, solToLamports } from "../../src/logic/onchain";
import { openPositionIx, positionAddress } from "../../src/solana/program";

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))));
const user = Keypair.generate();
await sendAndConfirmTransaction(conn, new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: user.publicKey, lamports: 0.1 * LAMPORTS_PER_SOL })), [funder]);
const nonce = BigInt(Date.now());
const stake = solToLamports(0.02);
const pos = positionAddress(user.publicKey, nonce);
await sendAndConfirmTransaction(conn, new Transaction().add(openPositionIx({ user: user.publicKey, nonce, amount: stake, leverage: 10, commitment: commitmentBytes(Array.from({ length: 60 }, () => 100)), slot: 0 })), [user]);
const afterOpen = await conn.getBalance(user.publicKey);
console.log("staked", pos.toBase58().slice(0, 8), "at", new Date().toISOString().slice(11, 19));
for (let i = 0; i < 120; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const info = await conn.getAccountInfo(pos);
  if (info && !decodePosition(info.data).isOpen) {
    const p = decodePosition(info.data);
    const back = (await conn.getBalance(user.publicKey)) - afterOpen;
    console.log("closed at", new Date().toISOString().slice(11, 19), "pnl", p.pnl.toString(), "refunded lamports", back, "stake", stake.toString());
    process.exit(back === Number(stake) ? 0 : 2);
  }
}
console.log("timed out");
process.exit(1);
