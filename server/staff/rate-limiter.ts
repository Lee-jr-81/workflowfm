interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; resetAt?: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, {
      attempts: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.attempts += 1;
  return { allowed: true };
}

export function cleanupRateLimiter() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

setInterval(cleanupRateLimiter, 60 * 1000);
