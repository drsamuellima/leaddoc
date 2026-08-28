import { NextResponse } from "next/server";
import { cookieBase, SESSION_COOKIE, sessionCookieValue } from "@/lib/auth";
import { clientIp } from "@/lib/config";
import { verifyPassword } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function jsonError(code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status: 200 });
}

function describeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/SESSION_SECRET/i.test(message)) {
    return { code: "server", error: "Login is missing SESSION_SECRET on the server. Add it in Vercel and redeploy." };
  }
  if (/database|postgres|connect|ssl|timeout|ENOTFOUND|ECONN|ECONNREFUSED/i.test(message)) {
    return {
      code: "database",
      error: "Could not reach the database. DATABASE_URL must be the Supabase transaction pooler (port 6543), not SUPABASE_URL.",
    };
  }
  return { code: "server", error: "Sign-in failed. Try again, or check Vercel runtime logs." };
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export async function POST(request: Request) {
  if (!rateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000)) {
    return jsonError("rate", "Too many attempts. Wait a few minutes and try again.");
  }
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const store = await readStore();
    const user = store.profiles.find((p) => p.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return jsonError("invalid", "Invalid email or password.");
    }
    const dest = user.role === "super_admin" ? "/admin" : "/app";
    const res = NextResponse.json({ ok: true, redirect: dest });
    res.cookies.set(SESSION_COOKIE, sessionCookieValue(user.id), {
      ...cookieBase(),
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("login failed", error);
    const { code, error: message } = describeError(error);
    return jsonError(code, message);
  }
}
