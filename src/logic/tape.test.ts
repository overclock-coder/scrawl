import { describe, expect, it } from "vitest";
import { PriceTape } from "./tape";

describe("PriceTape", () => {
  const T0 = 1_700_000_000_000;

  it("rebuilds a window with the price in force at the start and forward-fills quiet seconds", () => {
    const t = new PriceTape();
    t.add(100, T0 - 5_000);
    t.add(101, T0 + 10_500);
    t.add(102, T0 + 30_100);
    t.add(103, T0 + 59_900);
    const w = t.window(T0);
    expect(w).toHaveLength(60);
    expect(w[0]).toBe(100);
    expect(w[9]).toBe(100);
    expect(w[10]).toBe(101);
    expect(w[30]).toBe(102);
    expect(w[59]).toBe(103);
  });

  it("a tick in the first second wins over the seed", () => {
    const t = new PriceTape();
    t.add(100, T0 - 1000);
    t.add(105, T0 + 400);
    t.add(106, T0 + 59_999);
    expect(t.window(T0)[0]).toBe(105);
  });

  it("knows when the window is covered", () => {
    const t = new PriceTape();
    t.add(100, T0 + 1000);
    expect(t.covers(T0)).toBe(false);
    t.add(100, T0 + 59_500);
    expect(t.covers(T0)).toBe(true);
  });

  it("throws without data and prunes old ticks", () => {
    expect(() => new PriceTape().window(T0)).toThrow();
    const t = new PriceTape(10_000);
    for (let i = 0; i < 100; i++) t.add(100 + i, T0 + i * 1000);
    expect(t.window(T0 + 90_000)[0]).toBeGreaterThan(0);
  });
});
