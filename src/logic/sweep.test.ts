import { describe, expect, it } from "vitest";
import { RateLimiter } from "./ratelimit";
import { REFUND_AFTER_SEC, isStale } from "./sweep";
import { POSITION_IS_OPEN_OFFSET, POSITION_SIZE, decodePosition, discriminator } from "./onchain";

describe("isStale", () => {
  it("is false until the window plus the grace has passed", () => {
    expect(isStale(1000, 1000 + 60 + REFUND_AFTER_SEC)).toBe(false);
    expect(isStale(1000, 1000 + 60 + REFUND_AFTER_SEC + 1)).toBe(true);
  });
  it("a position that has not opened yet is never stale", () => {
    expect(isStale(5000, 1000)).toBe(false);
  });
});

describe("RateLimiter", () => {
  it("allows up to the limit per window, then resets", () => {
    const r = new RateLimiter(3, 1000);
    expect([1, 2, 3, 4].map(() => r.allow("a", 0))).toEqual([true, true, true, false]);
    expect(r.allow("b", 0)).toBe(true);
    expect(r.allow("a", 1000)).toBe(true);
  });
});

describe("open flag offset", () => {
  it("points at the isOpen byte of the account layout", () => {
    const buf = new Uint8Array(POSITION_SIZE);
    buf.set(discriminator("account", "Position"), 0);
    buf[POSITION_IS_OPEN_OFFSET] = 1;
    expect(decodePosition(buf).isOpen).toBe(true);
    buf[POSITION_IS_OPEN_OFFSET] = 0;
    expect(decodePosition(buf).isOpen).toBe(false);
  });
});
