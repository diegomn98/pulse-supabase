export interface RateLimiter {
  hit(key: string): boolean;
}

interface Options {
  limit: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}

export function createRateLimiter(
  { limit, windowMs, maxKeys = 10_000, now = Date.now }: Options,
): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();

  function pruneExpired(time: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= time) windows.delete(key);
    }
  }

  return {
    hit(key) {
      const time = now();
      if (windows.size >= maxKeys) pruneExpired(time);

      const window = windows.get(key);
      if (!window || window.resetAt <= time) {
        windows.set(key, { count: 1, resetAt: time + windowMs });
        return true;
      }
      if (window.count >= limit) return false;
      window.count += 1;
      return true;
    },
  };
}
