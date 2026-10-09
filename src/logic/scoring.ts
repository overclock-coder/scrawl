import { ScoreResult, WINDOW } from "./types";

export const FEE_BPS = 200;
export const MAX_LEVERAGE = 100;

export const direction = (a: number, b: number): -1 | 0 | 1 =>
  b > a ? 1 : b < a ? -1 : 0;

/**
 * Directional score. Steps where the real price did not tick carry no signal,
 * so they are skipped instead of counting against a hand-drawn line that can
 * never be perfectly flat. If nothing moved at all the round is a draw (0.5).
 */
export function directionalAccuracy(predicted: number[], actual: number[]) {
  if (predicted.length !== WINDOW || actual.length !== WINDOW) {
    throw new Error(`expected ${WINDOW} samples each`);
  }
  let correct = 0;
  let compared = 0;
  for (let i = 0; i < WINDOW - 1; i++) {
    const a = direction(actual[i], actual[i + 1]);
    if (a === 0) continue;
    compared++;
    if (direction(predicted[i], predicted[i + 1]) === a) correct++;
  }
  return { correct, compared, accuracy: compared === 0 ? 0.5 : correct / compared };
}

/** PnL = (2 * accuracy - 1) * maxProfit, fee only on profit, loss floored at the stake. */
export function scoreRound(
  predicted: number[],
  actual: number[],
  stake: number,
  leverage: number,
  feeBps = FEE_BPS
): ScoreResult {
  if (!(stake > 0)) throw new Error("stake must be positive");
  if (!(leverage >= 1 && leverage <= MAX_LEVERAGE)) throw new Error("leverage out of range");
  if (!(actual[0] > 0)) throw new Error("invalid start price");

  const { correct, compared, accuracy } = directionalAccuracy(predicted, actual);
  const priceMove = Math.abs(actual[WINDOW - 1] - actual[0]);
  const maxProfit = priceMove * (stake / actual[0]) * leverage;
  const raw = (2 * accuracy - 1) * maxProfit;
  const pnl = Math.max(raw, -stake);
  const fee = pnl > 0 ? (pnl * feeBps) / 10_000 : 0;
  return { accuracy, correct, compared, priceMove, maxProfit, pnl, fee, payout: stake + pnl - fee };
}
