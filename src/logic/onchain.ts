import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { canonical } from "./commit";

/** Shared by the app and the settler: byte-level view of the on-chain futures program. */
export const FUTURES_PROGRAM_ID = "FYHebuyTZwg2JWaHTHtRY7xCYgEHpiX1Frq98Awzkhtu";
export const LAMPORTS = 1_000_000_000;
export const MIN_STAKE_LAMPORTS = 10_000_000n;
export const FEE_BPS_DEFAULT = 200n;
export const SLOT_SECONDS = 60;

/** Anchor instruction/account discriminator: first 8 bytes of sha256("<kind>:<name>"). */
export const discriminator = (kind: "global" | "account" | "event", name: string) =>
  sha256(utf8ToBytes(`${kind}:${name}`)).slice(0, 8);

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const u64 = (v: bigint) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, v, true);
  return b;
};
const i64 = (v: bigint) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigInt64(0, v, true);
  return b;
};
const u16 = (v: number) => {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, true);
  return b;
};

/** 32-byte commitment of a price path; same bytes as hashPrices() but not hex. */
export const commitmentBytes = (prices: number[]) => sha256(utf8ToBytes(canonical(prices)));

export const solToLamports = (sol: number) => BigInt(Math.round(sol * LAMPORTS));
export const lamportsToSol = (l: bigint | number) => Number(l) / LAMPORTS;

export function encodeOpenPosition(a: { nonce: bigint; amount: bigint; leverage: number; commitment: Uint8Array; slot: number }) {
  if (a.commitment.length !== 32) throw new Error("commitment must be 32 bytes");
  return concat(discriminator("global", "open_position"), u64(a.nonce), u64(a.amount), u16(a.leverage), a.commitment, Uint8Array.of(a.slot));
}

export function encodeClosePosition(a: { pnl: bigint; actualCommitment: Uint8Array }) {
  if (a.actualCommitment.length !== 32) throw new Error("commitment must be 32 bytes");
  return concat(discriminator("global", "close_position"), i64(a.pnl), a.actualCommitment);
}

export interface PositionAccount {
  user: Uint8Array;
  nonce: bigint;
  amount: bigint;
  leverage: number;
  openTimestamp: number;
  predictionCommitment: Uint8Array;
  isOpen: boolean;
  pnl: bigint;
  actualCommitment: Uint8Array;
  closeTimestamp: number;
}

export const POSITION_SIZE = 8 + 32 + 8 + 8 + 2 + 8 + 32 + 1 + 8 + 32 + 8 + 1;
/** Byte offset of `is_open` inside a Position account (used to ask the RPC for open positions only). */
export const POSITION_IS_OPEN_OFFSET = 8 + 32 + 8 + 8 + 2 + 8 + 32;

export function decodePosition(data: Uint8Array): PositionAccount {
  if (data.length < POSITION_SIZE) throw new Error("position account too short");
  const want = discriminator("account", "Position");
  if (!want.every((v, i) => data[i] === v)) throw new Error("not a position account");
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8;
  const user = data.slice(o, (o += 32));
  const nonce = dv.getBigUint64(o, true); o += 8;
  const amount = dv.getBigUint64(o, true); o += 8;
  const leverage = dv.getUint16(o, true); o += 2;
  const openTimestamp = Number(dv.getBigInt64(o, true)); o += 8;
  const predictionCommitment = data.slice(o, (o += 32));
  const isOpen = data[o++] === 1;
  const pnl = dv.getBigInt64(o, true); o += 8;
  const actualCommitment = data.slice(o, (o += 32));
  const closeTimestamp = Number(dv.getBigInt64(o, true));
  return { user, nonce, amount, leverage, openTimestamp, predictionCommitment, isOpen, pnl, actualCommitment, closeTimestamp };
}

/** Convert a float pnl (in SOL) to lamports within the program's bounds [-amount, amount * leverage]. */
export function pnlToLamports(pnlSol: number, amount: bigint, leverage: number): bigint {
  const raw = BigInt(Math.round(pnlSol * LAMPORTS));
  const hi = amount * BigInt(leverage);
  return raw < -amount ? -amount : raw > hi ? hi : raw;
}

/**
 * The vault only holds players' stakes plus whatever liquidity was seeded, so cap a win at what can
 * actually be paid. `available` is the vault balance above its rent-exempt minimum.
 */
export function capByLiquidity(pnl: bigint, amount: bigint, available: bigint, feeBps = FEE_BPS_DEFAULT): bigint {
  if (pnl <= 0n) return pnl;
  // payout = amount + pnl - fee, fee = pnl * feeBps / 10000  =>  pnl <= (available - amount) * 10000 / (10000 - feeBps)
  const room = available - amount;
  if (room <= 0n) return 0n;
  const max = (room * 10_000n) / (10_000n - feeBps);
  return pnl > max ? max : pnl;
}
