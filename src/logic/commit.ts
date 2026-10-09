import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

/** Prices are rounded to 6 dp so the hash is stable across devices. */
export const canonical = (prices: number[]) => prices.map((p) => p.toFixed(6)).join(",");

export const hashPrices = (prices: number[]) => bytesToHex(sha256(utf8ToBytes(canonical(prices))));

/** Memo written before the round starts: proves the drawing existed before the prices did. */
export function commitMemo(hash: string, asset: string, leverage: number, startedAt: number) {
  return `scrawl:v1:commit:${asset}:${leverage}x:${Math.floor(startedAt / 1000)}:${hash.slice(0, 32)}`;
}

/** Memo written after the round: ties the realised prices and score to the commit. */
export function settleMemo(commitHash: string, actualHash: string, accuracyPct: number) {
  return `scrawl:v1:settle:${commitHash.slice(0, 16)}:${actualHash.slice(0, 16)}:${accuracyPct.toFixed(1)}`;
}
