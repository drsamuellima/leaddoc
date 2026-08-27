import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
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
