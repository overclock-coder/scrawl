export const CLUSTER = "devnet" as const;
export const RPC_URL = "https://api.devnet.solana.com";
export const EXPLORER = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;

export const ASSET = "SOL";
export const FEED_URL = "wss://stream.bybit.com/v5/public/spot";
export const FEED_TOPIC = "tickers.SOLUSDT";

// Half-height of the drawing canvas as a fraction of the start price (0.15% each way).
export const BAND_PCT = 0.0015;

export const START_BALANCE = 1000;
export const DAILY_BONUS = 100;

// uri must serve `icon` (relative) and, for silent re-authorise in Phantom, be a verified identity domain.
export const APP_IDENTITY = { name: "Scrawl", uri: "https://scrawl.app", icon: "favicon.png" } as const;
