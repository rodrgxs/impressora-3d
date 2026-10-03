type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_CLIENTS = 10_000;
const globalForRateLimit = globalThis as typeof globalThis & {
  quoteRateLimits?: Map<string, RateLimitEntry>;
};
const quoteRateLimits = globalForRateLimit.quoteRateLimits ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.quoteRateLimits = quoteRateLimits;
}

export function consumeQuoteRateLimit(clientKey: string, now = Date.now()) {
  for (const [key, entry] of quoteRateLimits) {
    if (entry.resetAt <= now) quoteRateLimits.delete(key);
  }

  const entry = quoteRateLimits.get(clientKey);
  if (!entry) {
    if (quoteRateLimits.size >= MAX_TRACKED_CLIENTS) {
      return { allowed: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
    }
    quoteRateLimits.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
