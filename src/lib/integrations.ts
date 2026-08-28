import { headers } from "next/headers";

function configuredAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isLocalUrl(url: string) {
  try {
    return isLocalHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function appUrl() {
  return configuredAppUrl() || "http://localhost:3000";
}

/** Prefer the live request host so snippets/iframes match the running port (e.g. 3001). */
export function originFromRequest(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost || request.headers.get("host") || "").split(",")[0].trim();
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (isLocalHost(host.split(":")[0]) ? "http" : new URL(request.url).protocol.replace(":", ""));
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export function resolvePublicOrigin(request?: Request) {
  const env = configuredAppUrl();
  const fromRequest = request ? originFromRequest(request) : "";
  if (fromRequest && (!env || isLocalUrl(env))) return fromRequest;
  return env || fromRequest || "http://localhost:3000";
}

export async function publicOrigin() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host) return resolvePublicOrigin();
  const proto = h.get("x-forwarded-proto") || (isLocalHost(host.split(":")[0]) ? "http" : "https");
  return resolvePublicOrigin(new Request(`${proto}://${host}/`, { headers: h }));
}

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function geminiApiKey() {
  return (process.env.GEMINI_API_KEY || "").trim();
}

export function hasGemini() {
  return Boolean(geminiApiKey());
}

export function hasResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function stripeRequest(path: string, body?: URLSearchParams) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body?.toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Stripe request failed");
  }
  return json;
}

export async function stripeGet(path: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Stripe request failed");
  return json;
}
