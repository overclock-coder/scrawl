import { describe, expect, it } from "vitest";
import { PriceWindow } from "./priceWindow";
import { commitMemo, hashPrices, settleMemo } from "./commit";
import { classifyWalletError } from "./walletErrors";
import { bumpStreak } from "./streak";

const ramp = (a: number, b: number) => Array.from({ length: 60 }, (_, i) => a + ((b - a) * i) / 59);

describe("PriceWindow", () => {
  it("keeps the last tick per second and fills gaps both ways", () => {
    const w = new PriceWindow(0);
    w.tick(5, 1500);
    w.tick(6, 1900);
    w.tick(8, 4000);
    const p = w.prices();
    expect(p[0]).toBe(6);
    expect(p[3]).toBe(6);
    expect(p[4]).toBe(8);
    expect(p[59]).toBe(8);
    expect(w.isComplete(59_999)).toBe(false);
    expect(w.isComplete(60_000)).toBe(true);
  });
  it("ignores junk and throws with no data", () => {
    const w = new PriceWindow(0);
    w.tick(NaN, 0);
    w.tick(-1, 0);
    expect(() => w.prices()).toThrow();
  });
});

describe("commit", () => {
  it("hash is deterministic, 64 hex, and sensitive to changes", () => {
    const a = ramp(1, 2);
    expect(hashPrices(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPrices(a)).toBe(hashPrices([...a]));
    expect(hashPrices(a)).not.toBe(hashPrices(ramp(1, 2.00001)));
  });
  it("memos stay far below the memo size limit", () => {
    const h = hashPrices(ramp(1, 2));
    expect(commitMemo(h, "SOL", 50, Date.now()).length).toBeLessThan(120);
    expect(settleMemo(h, h, 71.4).length).toBeLessThan(120);
  });
});

describe("wallet errors", () => {
  it("treats backing out as retryable cancellation", () => {
    expect(classifyWalletError(new Error("Cannot send in CLOSED")).kind).toBe("cancelled");
    expect(classifyWalletError({ code: "ERROR_WALLET_NOT_FOUND", message: "x" }).kind).toBe("no-wallet");
    expect(classifyWalletError(new Error("boom")).kind).toBe("failed");
  });
});

describe("streak", () => {
  const day = 24 * 3600 * 1000;
  const t = new Date(2026, 9, 9, 12).getTime();
  it("extends on consecutive days, holds same day, resets on a gap", () => {
    let s = bumpStreak({ count: 0, lastDay: null }, t);
    expect(s.count).toBe(1);
    expect(bumpStreak(s, t + 1000).count).toBe(1);
    s = bumpStreak(s, t + day);
    expect(s.count).toBe(2);
    expect(bumpStreak(s, t + 4 * day).count).toBe(1);
  });
});
