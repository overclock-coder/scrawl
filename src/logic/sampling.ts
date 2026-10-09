import { Point, WINDOW } from "./types";

/**
 * Keep a stroke strictly left-to-right: a point that moves backwards in x is
 * dropped, so the stroke is always a function of time.
 */
export function appendPoint(stroke: Point[], p: Point, width: number): Point[] {
  const x = Math.min(Math.max(p.x, 0), width);
  const last = stroke[stroke.length - 1];
  if (last && x <= last.x) return stroke;
  return [...stroke, { x, y: p.y }];
}

/** Linear interpolation of the stroke at x; flat before the first and after the last point. */
export function valueAt(stroke: Point[], x: number): number {
  if (stroke.length === 0) throw new Error("empty stroke");
  if (x <= stroke[0].x) return stroke[0].y;
  const last = stroke[stroke.length - 1];
  if (x >= last.x) return last.y;
  let lo = 0;
  let hi = stroke.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (stroke[mid].x <= x) lo = mid;
    else hi = mid;
  }
  const a = stroke[lo];
  const b = stroke[hi];
  return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
}

/** Minimum horizontal coverage (fraction of the canvas) before a stroke counts as a prediction. */
export const MIN_COVERAGE = 0.6;

export function coverage(stroke: Point[], width: number): number {
  if (stroke.length < 2) return 0;
  return (stroke[stroke.length - 1].x - stroke[0].x) / width;
}

/**
 * Resample a stroke to 60 prices, one per second. Canvas y grows downward, so
 * it is flipped; `bandPct` is the half-height of the canvas as a fraction of
 * the start price.
 */
export function strokeToPrices(
  stroke: Point[],
  width: number,
  height: number,
  startPrice: number,
  bandPct: number
): number[] {
  const out: number[] = [];
  for (let i = 0; i < WINDOW; i++) {
    const y = valueAt(stroke, (i / (WINDOW - 1)) * width);
    const unit = 1 - (2 * y) / height; // +1 top, -1 bottom
    out.push(startPrice * (1 + unit * bandPct));
  }
  return out;
}
