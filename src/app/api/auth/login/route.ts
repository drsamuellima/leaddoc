import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { clientIp } from "@/lib/config";
import { verifyPassword } from "@/lib/crypto";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  if (!rateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(rateLimitResponse(), { status: 429 });
  }
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const store = await readStore();
  const user = store.profiles.find((p) => p.email.toLowerCase() === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }
  await setSession(user.id);
  const dest = user.role === "super_admin" ? "/admin" : "/app";
  return NextResponse.redirect(new URL(dest, request.url), 303);
}
