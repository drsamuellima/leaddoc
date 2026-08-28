const windows = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const start = now - windowMs;
  const hits = (windows.get(key) || []).filter((t) => t > start);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  return true;
}

export function rateLimitResponse() {
  return { error: "Too many requests. Try again shortly." };
}
