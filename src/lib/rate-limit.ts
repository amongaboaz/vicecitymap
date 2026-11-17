/**
 * Small fixed-window rate limiter.
 *
 * In-memory: effective per server instance. On Vercel each function instance
 * keeps its own window, so treat this as abuse damping, not a hard quota.
 * For strict limits swap `MemoryStore` for a shared store (e.g. Upstash Redis).
 */
export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

type Bucket = { count: number; resetAt: number };

export class MemoryRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): RateLimitResult {
    const t = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= t) {
      const fresh = { count: 1, resetAt: t + this.windowMs };
      this.buckets.set(key, fresh);
      this.sweep(t);
      return { ok: true, remaining: this.limit - 1, resetAt: fresh.resetAt };
    }
    bucket.count += 1;
    return { ok: bucket.count <= this.limit, remaining: Math.max(0, this.limit - bucket.count), resetAt: bucket.resetAt };
  }

  private sweep(t: number) {
    if (this.buckets.size < 5000) return;
    for (const [k, b] of this.buckets) if (b.resetAt <= t) this.buckets.delete(k);
  }
}

const limiters = {
  auth: new MemoryRateLimiter(10, 10 * 60 * 1000),
  checkout: new MemoryRateLimiter(5, 10 * 60 * 1000),
  write: new MemoryRateLimiter(60, 60 * 1000),
  read: new MemoryRateLimiter(240, 60 * 1000),
};

export type LimiterName = keyof typeof limiters;

export function rateLimit(name: LimiterName, key: string): RateLimitResult {
  return limiters[name].check(`${name}:${key}`);
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
