import { WINDOW } from "./types";

/** If the settler has no drawing for a position this long after its window closed, refund the stake. */
export const REFUND_AFTER_SEC = 5 * 60;

export const isStale = (openTimestamp: number, nowSec: number, graceSec = REFUND_AFTER_SEC) =>
  nowSec > openTimestamp + WINDOW + graceSec;
