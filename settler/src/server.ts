// Settles on-chain positions: verifies the drawing against the on-chain commitment, scores it against the
// prices this process recorded itself, then calls close_position as the settler key.
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { commitmentBytes, decodePosition, lamportsToSol, capByLiquidity, pnlToLamports, FUTURES_PROGRAM_ID, SLOT_SECONDS } from "../../src/logic/onchain";
import { scoreRound } from "../../src/logic/scoring";
import { PriceTape } from "../../src/logic/tape";
import { WINDOW } from "../../src/logic/types";
import { VAULT_PDA, closePositionIx } from "../../src/solana/program";

const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const PORT = Number(process.env.PORT ?? 3000);
const KEY_PATH = process.env.SETTLER_KEYPAIR ?? `${homedir()}/.config/solana/scrawl-settler.json`;
const FEED_URL = "wss://stream.bybit.com/v5/public/spot";
const FEED_TOPIC = "tickers.SOLUSDT";
const SAFETY_MS = 3000; // settle a few seconds after the window so the chain clock has certainly passed it
const RETRIES = 6;

const settler = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(KEY_PATH, "utf8"))));
const conn = new Connection(RPC, "confirmed");
const tape = new PriceTape();
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

interface Job {
  status: "pending" | "settled" | "failed";
  position: string;
  openTimestamp: number;
  error?: string;
  result?: {
    accuracy: number; correct: number; compared: number; pnlSol: number; payoutSol: number; actual: number[]; signature: string;
  };
}
const jobs = new Map<string, Job>();

// ---- price feed (reconnects forever) ----
let feedLive = false;
function connectFeed() {
  const ws = new WebSocket(FEED_URL);
  ws.onopen = () => ws.send(JSON.stringify({ op: "subscribe", args: [FEED_TOPIC] }));
  ws.onmessage = (ev) => {
    try {
      const m = JSON.parse(String(ev.data));
      if (m.topic !== FEED_TOPIC || !m.data?.lastPrice) return;
      tape.add(parseFloat(m.data.lastPrice), Date.now());
      feedLive = true;
    } catch { /* ignore malformed frames */ }
  };
  ws.onclose = () => { feedLive = false; setTimeout(connectFeed, 2000); };
  ws.onerror = () => ws.close();
}
connectFeed();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function settle(job: Job, predicted: number[]) {
  const pos = new PublicKey(job.position);
  const startMs = job.openTimestamp * 1000;
  try {
    await sleep(Math.max(0, startMs + SLOT_SECONDS * 1000 + SAFETY_MS - Date.now()));
    for (let i = 0; i < 20 && !tape.covers(startMs); i++) await sleep(500);

    const info = await conn.getAccountInfo(pos);
    if (!info) throw new Error("position vanished");
    const p = decodePosition(info.data);
    if (!p.isOpen) throw new Error("already closed");

    const actual = tape.window(startMs);
    const stakeSol = lamportsToSol(p.amount);
    const score = scoreRound(predicted, actual, stakeSol, p.leverage);
    const vault = await conn.getBalance(VAULT_PDA);
    const rent = await conn.getMinimumBalanceForRentExemption(0);
    const available = BigInt(Math.max(0, vault - rent));
    const pnl = capByLiquidity(pnlToLamports(score.pnl, p.amount, p.leverage), p.amount, available);

    let lastErr: unknown;
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      try {
        const tx = new Transaction().add(closePositionIx({
          settler: settler.publicKey, position: pos, user: new PublicKey(p.user), pnl, actualCommitment: commitmentBytes(actual),
        }));
        const signature = await sendAndConfirmTransaction(conn, tx, [settler], { commitment: "confirmed" });
        const fee = pnl > 0n ? (pnl * 200n) / 10_000n : 0n;
        const payout = p.amount + pnl - fee;
        job.status = "settled";
        job.result = { accuracy: score.accuracy, correct: score.correct, compared: score.compared, pnlSol: lamportsToSol(pnl), payoutSol: lamportsToSol(payout > 0n ? payout : 0n), actual, signature };
        log("settled", job.position.slice(0, 8), `acc ${(score.accuracy * 100).toFixed(1)}%`, `pnl ${lamportsToSol(pnl).toFixed(5)} SOL`, signature.slice(0, 12));
        return;
      } catch (e) {
        lastErr = e;
        await sleep(2500);
      }
    }
    throw lastErr;
  } catch (e) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : String(e);
    log("FAILED", job.position.slice(0, 8), job.error);
  }
}

async function register(body: any): Promise<{ code: number; json: unknown }> {
  const predicted: unknown = body?.predicted;
  if (typeof body?.position !== "string" || !Array.isArray(predicted) || predicted.length !== WINDOW || !predicted.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0)) {
    return { code: 400, json: { error: "expected { position, predicted: number[60] }" } };
  }
  let pos: PublicKey;
  try { pos = new PublicKey(body.position); } catch { return { code: 400, json: { error: "bad position address" } }; }
  const existing = jobs.get(pos.toBase58());
  if (existing) return { code: 200, json: view(existing) };

  const info = await conn.getAccountInfo(pos, "confirmed");
  if (!info || info.owner.toBase58() !== FUTURES_PROGRAM_ID) return { code: 404, json: { error: "position not found on-chain" } };
  const p = decodePosition(info.data);
  if (!p.isOpen) return { code: 409, json: { error: "position already closed" } };
  const want = commitmentBytes(predicted as number[]);
  if (!want.every((v, i) => v === p.predictionCommitment[i])) return { code: 422, json: { error: "drawing does not match the on-chain commitment" } };

  const job: Job = { status: "pending", position: pos.toBase58(), openTimestamp: p.openTimestamp };
  jobs.set(job.position, job);
  log("registered", job.position.slice(0, 8), `${p.leverage}x`, `${lamportsToSol(p.amount)} SOL`, `settles in ${Math.max(0, p.openTimestamp + 60 - Math.floor(Date.now() / 1000))}s`);
  void settle(job, predicted as number[]);
  return { code: 202, json: view(job) };
}

const view = (j: Job) => ({ status: j.status, position: j.position, openTimestamp: j.openTimestamp, error: j.error, result: j.result });

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 64_000) throw new Error("body too large");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const send = (res: ServerResponse, code: number, json: unknown) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(json));
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true, feedLive, settler: settler.publicKey.toBase58(), program: FUTURES_PROGRAM_ID });
    if (req.method === "POST" && url.pathname === "/positions") {
      const r = await register(await readJson(req));
      return send(res, r.code, r.json);
    }
    const m = url.pathname.match(/^\/positions\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
    if (req.method === "GET" && m) {
      const j = jobs.get(m[1]);
      return j ? send(res, 200, view(j)) : send(res, 404, { error: "unknown position" });
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 400, { error: e instanceof Error ? e.message : "bad request" });
  }
}).listen(PORT, () => {
  log(`settler ${settler.publicKey.toBase58()} listening on :${PORT} (${RPC})`);
});
