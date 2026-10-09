import { PriceWindow } from "./priceWindow";
import { WINDOW } from "./types";

/** Rolling record of every price tick, so any past 60s window can be rebuilt for settlement. */
export class PriceTape {
  private ticks: { t: number; p: number }[] = [];

  constructor(private keepMs = 30 * 60 * 1000) {}

  add(price: number, atMs: number) {
    if (!(price > 0) || !Number.isFinite(price)) return;
    this.ticks.push({ t: atMs, p: price });
    const cutoff = atMs - this.keepMs;
    if (this.ticks.length > 1 && this.ticks[0].t < cutoff) {
      const i = this.ticks.findIndex((x) => x.t >= cutoff);
      this.ticks = i < 0 ? this.ticks.slice(-1) : this.ticks.slice(Math.max(0, i - 1));
    }
  }

  get latestAt(): number | null {
    return this.ticks.length ? this.ticks[this.ticks.length - 1].t : null;
  }

  /** True once the tape covers the whole window. */
  covers(startMs: number) {
    const n = this.latestAt;
    return n !== null && n >= startMs + WINDOW * 1000 - 1000;
  }

  /** The 60 per-second prices starting at `startMs`; the price in force at the start seeds the first slots. */
  window(startMs: number): number[] {
    const w = new PriceWindow(startMs);
    let before: number | undefined;
    for (const x of this.ticks) {
      if (x.t < startMs) before = x.p;
      else w.tick(x.p, x.t);
    }
    if (before !== undefined) w.tick(before, startMs);
    // a seed must not overwrite a real tick landing in the same first second
    for (const x of this.ticks) if (x.t >= startMs && x.t < startMs + 1000) w.tick(x.p, x.t);
    return w.prices();
  }
}
