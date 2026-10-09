# Scrawl

**Draw where the price goes. Seal it on Solana. Beat the next 60 seconds.**

Scrawl is an Android-first Solana game. You sketch a 60-second SOL/USDT price prediction with your finger, your wallet seals a hash of that drawing on-chain *before* the clock starts, and the live market scores how well your line matched. No order books, no charts to read: one gesture, one minute, one verdict.

Built for the Solana Mobile **CLOCK IN** hackathon (Mobile track).

> Status: hackathon prototype on **devnet**. Stakes are in-app "ink", not real money. See [What has and has not been verified](#what-has-and-has-not-been-verified).

---

## How a round works

1. **Draw.** Sweep a line left to right across the pad. The centre line is the price right now; the pad spans about ±0.15%.
2. **Configure.** Pick a stake (ink) and leverage (5x to 100x).
3. **Seal.** The app resamples your stroke to 60 prices (one per second), hashes them (SHA-256) and asks your wallet, through **Mobile Wallet Adapter**, to sign and send a Memo transaction containing the hash. The drawing is provably older than the prices it is judged against.
4. **Watch.** For 60 seconds your dotted drawing is overlaid on the live SOL/USDT line.
5. **Settle.** Optionally write a second memo that links the realised-price hash and your score to the commit.

### Scoring

Only the **direction** of each second-to-second move is scored, not magnitude.

```
accuracy = correct directions / compared moves
pnl      = (2 * accuracy - 1) * maxProfit          (floored at -stake)
maxProfit = |price_end - price_start| * (stake / price_start) * leverage
fee      = 2% of profit, profit only
```

- 50% accuracy is break-even, 100% earns the full `maxProfit`, 0% loses the stake.
- Seconds where the real price did not tick are skipped (they carry no direction, and a hand-drawn line is never perfectly flat). If nothing moved, the round is a draw.

### Habit loop

- Daily streak (consecutive days with a round) and a daily ink bonus.
- A personal record: win rate, best round, average accuracy, full history with replay and explorer links.

---

## Mobile design

- Native React Native UI (no WebView, no PWA): finger drawing with `PanResponder` and `react-native-svg`, haptics on touch, lock-in and result, screen kept awake during a round.
- The scroll view is locked while you draw, so a stroke never turns into a scroll.
- Android back button: closes results, is ignored mid-round (your stake is live), otherwise returns to the main tab.
- Portrait, dark theme, large touch targets, one-handed flow.

## Solana integration

| Piece | What it does |
|---|---|
| Mobile Wallet Adapter 2.0 | Authorize (with cached `auth_token` and silent re-authorize), `signAndSendTransactions`, deauthorize |
| Memo program | On-chain commit and settle records (`scrawl:v1:commit:...`, `scrawl:v1:settle:...`) |
| Devnet RPC | Blockhash (fetched *after* wallet authorization, since devnet blockhashes expire in ~36s), balance, faucet airdrop, confirmation |
| Live market feed | SOL/USDT ticks over WebSocket with backoff reconnect and a stale-connection watchdog |

Wallet errors are classified: backing out of the wallet (`Cannot send in CLOSED`, declined, cancelled) is a retryable state, not a failure; a missing wallet app gets its own message.

---

## Architecture

```
App.tsx                      shell: tabs, round/result overlays, back handler
src/
  logic/                     pure, unit-tested (no React, no network)
    scoring.ts               directional accuracy, PnL, fee
    sampling.ts              stroke -> 60 prices, left-to-right enforcement
    priceWindow.ts           one price per second, gap filling
    commit.ts                canonical hashing, memo payloads
    walletErrors.ts          cancelled / no-wallet / failed
    streak.ts                daily streak
  services/                  priceFeed.ts (WebSocket), kv.ts (storage)
  solana/wallet.ts           MWA session, memo transactions, devnet helpers
  state/store.tsx            profile, balance, history (persisted)
  screens/                   Play, Round, Result, Stats, WalletChip
  ui/                        DrawPad, LineChart, kit, theme
plugins/withReleaseSigning.js   config plugin: release signing that survives prebuild
app.config.ts                   Expo config (android/ is generated and git-ignored)
```

Stack: Expo SDK 57, React Native 0.86 (Hermes), TypeScript, `@solana/web3.js` 1.x, `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, `@noble/hashes`, Vitest.

---

## Run it

Prerequisites: Node 22+, Android Studio with SDK, platform-tools and the NDK it asks for (`ANDROID_HOME` set), a phone with USB debugging, and a Solana wallet app (Phantom, Solflare or Seed Vault on a Seeker) set to **devnet** with some devnet SOL.

```bash
npm install
npm test            # pure-logic tests
npm run typecheck
npm run android     # builds a dev client and installs it on the connected phone
```

Slow Gradle downloads: `JAVA_TOOL_OPTIONS="-Djava.net.preferIPv6Addresses=true" npm run android`.

The app needs no backend and no API keys: it talks directly to the public market feed and devnet RPC. A release APK is standalone and uses only `https`/`wss`.

### Release APK

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ~/.signing/scrawl-release.keystore \
  -alias scrawl -keyalg RSA -keysize 2048 -validity 10000
```

Put these in `~/.gradle/gradle.properties` (never in the repo):

```
SCRAWL_KEYSTORE_FILE=/Users/you/.signing/scrawl-release.keystore
SCRAWL_KEYSTORE_PASSWORD=...
SCRAWL_KEY_ALIAS=scrawl
```

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk   # must not say "Android Debug"
```

Without those properties the release build falls back to the debug key. Bump `android.versionCode` in `app.config.ts` for every release.

---

## What has and has not been verified

Verified (on this machine):
- `tsc --noEmit` passes; 13 unit tests pass (scoring, sampling, price window, commit hash and memo size, wallet error classes, streak).
- Metro produces an Android Hermes bundle (`expo export`).
- `expo prebuild` generates the Android project with package `app.scrawl.mobile` and the release-signing block.

**Not yet run:** the app on a physical device, any MWA session with a real wallet, a devnet memo transaction, the Gradle debug/release build, the live price feed on a phone, and the settle flow. Nothing here has been tested with real money, and there is no mainnet path.

## Known limitations

- Stakes are in-app ink (balance is stored on the phone), so there is no real PnL, pool or payout on-chain. On-chain, only commit/settle memos are written.
- Scores are computed on the phone from the public feed; a modified client could report a different result. A trustworthy leaderboard needs a server or program that re-derives scores from the committed hash and an independent price source.
- The wallet identity uses `https://scrawl.app` as a placeholder; Phantom only silently re-authorizes verified identity domains, so it may ask to connect on every seal until a real domain with Digital Asset Links is set.
- Default Expo launcher icons are still in `assets/`.

## Roadmap

- On-chain program with escrowed stakes (USDC) and settlement from an oracle price window.
- Seeker integration: Seed Vault signing, SKR rewards and streak badges.
- Shareable round cards; friends' leaderboards.
- Solana dApp Store listing.

## License

MIT
