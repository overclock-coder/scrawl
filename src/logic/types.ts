export const WINDOW = 60;

export interface Point {
  x: number;
  y: number;
}

export interface ScoreResult {
  accuracy: number;
  correct: number;
  compared: number;
  priceMove: number;
  maxProfit: number;
  pnl: number;
  fee: number;
  payout: number;
}

export interface RoundRecord {
  id: string;
  asset: string;
  startedAt: number;
  stake: number;
  leverage: number;
  predicted: number[];
  actual: number[];
  score: ScoreResult;
  commitHash: string;
  commitSig?: string;
  settleSig?: string;
  /** Set for rounds staked with real devnet SOL through the on-chain program. */
  live?: { position: string };
}
