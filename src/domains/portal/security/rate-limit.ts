type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE_BEFORE_CLEANUP = 10_000;

function cleanupRateLimitStore(now: number): void {
  if (rateLimitStore.size <= MAX_STORE_SIZE_BEFORE_CLEANUP) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
  };
}

export function __resetRateLimitStoreForTests(): void {
  rateLimitStore.clear();
}
