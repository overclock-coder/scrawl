export const CLUSTER = "devnet" as const;
export const RPC_URL = "https://api.devnet.solana.com";
export const EXPLORER = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
export const EXPLORER_ADDRESS = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;

export const ASSET = "SOL";
export const FEED_URL = "wss://stream.bybit.com/v5/public/spot";
export const FEED_TOPIC = "tickers.SOLUSDT";

// Half-height of the drawing canvas as a fraction of the start price (0.15% each way).
export const BAND_PCT = 0.0015;

export const START_BALANCE = 1000;
export const DAILY_BONUS = 100;

// Phantom shows this name and icon on the connect and sign prompts. `icon` is resolved against `uri`, so the
// site at `uri` must serve /icon.png (deploy deck/site), and for silent re-authorise it must also serve
// /.well-known/assetlinks.json. Set EXPO_PUBLIC_APP_URI to the deployed https URL before building.
const APP_URI = process.env.EXPO_PUBLIC_APP_URI ?? "https://scrawl.app";
export const APP_IDENTITY = { name: "Scrawl", uri: APP_URI, icon: "icon.png" } as const;

// Settler: scores on-chain positions and closes them. Debug builds reach the Mac via `adb reverse tcp:3000 tcp:3000`;
// a release build needs an https URL (set EXPO_PUBLIC_SETTLER_URL).
export const SETTLER_URL = process.env.EXPO_PUBLIC_SETTLER_URL ?? "http://localhost:3000";
export const MIN_STAKE_SOL = 0.01;
// Each position account costs ~0.002 SOL of rent, plus a network fee.
export const POSITION_RENT_SOL = 0.002;
