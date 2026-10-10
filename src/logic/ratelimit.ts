/** Fixed-window request counter per key. Enough to stop a client hammering a public endpoint. */
export class RateLimiter {
  private hits = new Map<string, { n: number; resetAt: number }>();

  constructor(private limit: number, private windowMs: number) {}

  allow(key: string, nowMs: number): boolean {
    const h = this.hits.get(key);
    if (!h || nowMs >= h.resetAt) {
      this.hits.set(key, { n: 1, resetAt: nowMs + this.windowMs });
      this.prune(nowMs);
      return true;
    }
    h.n += 1;
    return h.n <= this.limit;
  }

  private prune(nowMs: number) {
    if (this.hits.size < 1000) return;
    for (const [k, v] of this.hits) if (nowMs >= v.resetAt) this.hits.delete(k);
  }
}
