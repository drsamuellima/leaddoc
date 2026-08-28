export function useJsonStore() {
  const value = (process.env.USE_JSON_STORE || "").trim().toLowerCase();
  return value === "1" || value === "true";
}

/** Postgres-backed production path (Vercel). Demo fallbacks are off. */
export function isLive() {
  return !useJsonStore();
}

/** Local JSON demo may simulate Stripe, log email, and use FAQ chat fallbacks. */
export function allowDemoFallbacks() {
  return useJsonStore();
}

export function isSecureCookie() {
  const url = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return false;
  return isLive() || process.env.NODE_ENV === "production";
}

export function sessionSecret() {
  const secret = (process.env.SESSION_SECRET || "").trim();
  if (secret) return secret;
  if (allowDemoFallbacks()) return "leaddoc-dev-session-secret";
  throw new Error("SESSION_SECRET is not set");
}

export function clientIp(request?: Request) {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
