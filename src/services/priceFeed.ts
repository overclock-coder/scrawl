import { FEED_TOPIC, FEED_URL } from "../config";

export type FeedStatus = "connecting" | "live" | "stale";
type PriceListener = (price: number, at: number) => void;
type StatusListener = (s: FeedStatus) => void;

/**
 * Live SOL/USDT ticks over WebSocket with exponential-backoff reconnect and a
 * stale-connection watchdog. Prices are delivered to listeners as they arrive.
 */
export class PriceFeed {
  private ws: WebSocket | null = null;
  private prices = new Set<PriceListener>();
  private statuses = new Set<StatusListener>();
  private attempts = 0;
  private stopped = true;
  private lastMsg = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  last: number | null = null;
  status: FeedStatus = "connecting";

  onPrice(fn: PriceListener) {
    this.prices.add(fn);
    return () => void this.prices.delete(fn);
  }

  onStatus(fn: StatusListener) {
    this.statuses.add(fn);
    return () => void this.statuses.delete(fn);
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.open();
    this.watchdog = setInterval(() => {
      if (this.lastMsg && Date.now() - this.lastMsg > 15_000) {
        this.setStatus("stale");
        this.ws?.close();
      }
    }, 5_000);
  }

  stop() {
    this.stopped = true;
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.retry) clearTimeout(this.retry);
    this.watchdog = this.retry = null;
    this.ws?.close();
    this.ws = null;
  }

  private setStatus(s: FeedStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statuses.forEach((f) => f(s));
  }

  private open() {
    this.setStatus("connecting");
    const ws = new WebSocket(FEED_URL);
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      ws.send(JSON.stringify({ op: "subscribe", args: [FEED_TOPIC] }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        if (msg.topic !== FEED_TOPIC || !msg.data?.lastPrice) return;
        const price = parseFloat(msg.data.lastPrice);
        if (!(price > 0)) return;
        const at = Date.now();
        this.lastMsg = at;
        this.last = price;
        this.setStatus("live");
        this.prices.forEach((f) => f(price, at));
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (this.stopped) return;
      this.attempts++;
      const delay = Math.min(1000 * 2 ** (this.attempts - 1), 15_000);
      this.retry = setTimeout(() => !this.stopped && this.open(), delay);
    };
    ws.onerror = () => ws.close();
  }
}

export const feed = new PriceFeed();
