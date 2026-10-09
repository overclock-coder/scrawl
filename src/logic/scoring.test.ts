import { describe, expect, it } from "vitest";
import { directionalAccuracy, scoreRound } from "./scoring";
import { appendPoint, coverage, strokeToPrices, valueAt } from "./sampling";

const ramp = (a: number, b: number) => Array.from({ length: 60 }, (_, i) => a + ((b - a) * i) / 59);

describe("scoring", () => {
  it("perfect direction match gives full accuracy and max profit minus fee", () => {
    const r = scoreRound(ramp(10, 20), ramp(100, 101), 100, 10);
    expect(r.accuracy).toBe(1);
    expect(r.pnl).toBeCloseTo(10);
    expect(r.fee).toBeCloseTo(r.pnl * 0.02);
    expect(r.payout).toBeCloseTo(100 + r.pnl - r.fee);
  });
  it("opposite direction loses, floored at the stake", () => {
    const r = scoreRound(ramp(20, 10), ramp(1, 100), 10, 100);
    expect(r.accuracy).toBe(0);
    expect(r.pnl).toBe(-10);
    expect(r.payout).toBe(0);
  });
  it("skips flat real steps and draws when nothing moved", () => {
    const flat = new Array(60).fill(50);
    expect(directionalAccuracy(ramp(1, 2), flat).accuracy).toBe(0.5);
    const mixed = [...flat];
    for (let i = 30; i < 60; i++) mixed[i] = 50 + (i - 29);
    const d = directionalAccuracy(ramp(1, 2), mixed);
    expect(d.compared).toBe(30);
    expect(d.accuracy).toBe(1);
  });
  it("rejects bad input", () => {
    expect(() => scoreRound(ramp(1, 2), ramp(1, 2), 0, 5)).toThrow();
    expect(() => scoreRound(ramp(1, 2), ramp(1, 2), 1, 101)).toThrow();
    expect(() => scoreRound([1], ramp(1, 2), 1, 5)).toThrow();
  });
});

describe("sampling", () => {
  it("drops backwards points and clamps to the canvas", () => {
    let s = appendPoint([], { x: 10, y: 5 }, 100);
    s = appendPoint(s, { x: 5, y: 1 }, 100);
    s = appendPoint(s, { x: 500, y: 9 }, 100);
    expect(s).toEqual([{ x: 10, y: 5 }, { x: 100, y: 9 }]);
  });
  it("interpolates and holds ends flat", () => {
    const s = [{ x: 10, y: 0 }, { x: 20, y: 10 }];
    expect(valueAt(s, 0)).toBe(0);
    expect(valueAt(s, 15)).toBe(5);
    expect(valueAt(s, 99)).toBe(10);
  });
  it("maps a stroke to 60 prices with y flipped", () => {
    const stroke = [{ x: 0, y: 100 }, { x: 200, y: 0 }];
    const p = strokeToPrices(stroke, 200, 100, 100, 0.01);
    expect(p).toHaveLength(60);
    expect(p[0]).toBeCloseTo(99);
    expect(p[59]).toBeCloseTo(101);
    expect(coverage(stroke, 200)).toBe(1);
  });
});
