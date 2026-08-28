import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { sessionSecret } from "./config";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function widgetKey(): string {
  return `dc_${randomBytes(12).toString("hex")}`;
}

export function generatePassword(): string {
  return randomBytes(12).toString("base64url");
}

export function hashToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

export function signValue(value: string): string {
  const sig = createHmac("sha256", sessionSecret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

export function verifySignedValue(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i <= 0) return null;
  const value = cookie.slice(0, i);
  const sig = cookie.slice(i + 1);
  const expected = createHmac("sha256", sessionSecret()).update(value).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return value;
}

export function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const items = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = items.find((p) => p[0] === "t")?.[1];
  const signature = items.find((p) => p[0] === "v1")?.[1];
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
