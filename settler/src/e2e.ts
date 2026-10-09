// End-to-end check on devnet: open a position, register the drawing, wait for the settler to close it.
// Usage: tsx src/e2e.ts [settlerUrl]
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { commitmentBytes, solToLamports } from "../../src/logic/onchain";
import { openPositionIx, positionAddress } from "../../src/solana/program";

const url = process.argv[2] ?? "http://localhost:3000";
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))));
const user = Keypair.generate();

const t = await (await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=SOLUSDT")).json();
const start = parseFloat(t.result.list[0].lastPrice);
const predicted = Array.from({ length: 60 }, (_, i) => start * (1 + 0.0004 * Math.sin(i / 6) + 0.00002 * i));

await sendAndConfirmTransaction(conn, new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: user.publicKey, lamports: 0.1 * LAMPORTS_PER_SOL })), [funder]);
const nonce = BigInt(Date.now());
const stake = solToLamports(0.02);
const before = await conn.getBalance(user.publicKey);
const openSig = await sendAndConfirmTransaction(conn, new Transaction().add(openPositionIx({ user: user.publicKey, nonce, amount: stake, leverage: 50, commitment: commitmentBytes(predicted), slot: 0 })), [user]);
const position = positionAddress(user.publicKey, nonce).toBase58();
console.log("opened", position, openSig.slice(0, 16));

const bad = await fetch(`${url}/positions`, { method: "POST", body: JSON.stringify({ position, predicted: predicted.map((p) => p * 1.01) }) });
console.log("tampered drawing ->", bad.status, (await bad.json() as any).error);
const ok = await fetch(`${url}/positions`, { method: "POST", body: JSON.stringify({ position, predicted }) });
console.log("real drawing     ->", ok.status);

for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 4000));
  const j: any = await (await fetch(`${url}/positions/${position}`)).json();
  process.stdout.write(`\r${j.status}   `);
  if (j.status !== "pending") {
    console.log("\n", JSON.stringify({ ...j, result: j.result && { ...j.result, actual: `[${j.result.actual.length} prices]` } }));
    const after = await conn.getBalance(user.publicKey);
    console.log("user balance change (lamports, includes fees/rent):", after - before);
    process.exit(j.status === "settled" ? 0 : 1);
  }
}
console.log("\ntimed out");
process.exit(1);
