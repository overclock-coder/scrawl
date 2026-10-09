import { WINDOW } from "./types";

/**
 * Collects one price per second for a round. Ticks arrive many times a second;
 * the latest tick in each second wins and gaps are forward-filled (or
 * back-filled from the first tick if the round began before any arrived).
 */
export class PriceWindow {
  private slots: (number | undefined)[] = new Array(WINDOW).fill(undefined);

  constructor(private startMs: number) {}

  tick(price: number, atMs: number) {
    if (!(price > 0) || !Number.isFinite(price)) return;
    const s = Math.floor((atMs - this.startMs) / 1000);
    if (s >= 0 && s < WINDOW) this.slots[s] = price;
  }

  isComplete(nowMs: number) {
    return nowMs - this.startMs >= WINDOW * 1000;
  }

  /** Prices recorded so far (for live drawing), without filling the future. */
  partial(): (number | undefined)[] {
    return [...this.slots];
  }

  prices(): number[] {
    const out = [...this.slots];
    let prev: number | undefined;
    for (let i = 0; i < WINDOW; i++) {
      if (out[i] !== undefined) prev = out[i];
      else if (prev !== undefined) out[i] = prev;
    }
    let next: number | undefined;
    for (let i = WINDOW - 1; i >= 0; i--) {
      if (out[i] !== undefined) next = out[i];
      else if (next !== undefined) out[i] = next;
    }
    if (out.some((v) => v === undefined)) throw new Error("no price data");
    return out as number[];
  }
}
