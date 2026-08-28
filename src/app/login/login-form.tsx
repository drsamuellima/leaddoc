"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

function errorMessage(error?: string | null) {
  if (!error) return null;
  if (error === "database") {
    return "Could not reach the database. DATABASE_URL must be the Supabase transaction pooler (port 6543), not SUPABASE_URL.";
  }
  if (error === "server") {
    return "Sign-in hit a server error. Check SESSION_SECRET and the latest Vercel logs.";
  }
  if (error === "invalid") return "Invalid email or password.";
  return error;
}

export function LoginForm({ error, ok }: { error?: string; ok?: string }) {
  const [message, setMessage] = useState(errorMessage(error));
  const [shakeKey, setShakeKey] = useState(0);
  const [pending, setPending] = useState(false);

  function fail(text: string) {
    setMessage(text);
    setShakeKey((n) => n + 1);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const form = event.currentTarget;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
        code?: string;
      };
      if (res.status === 504 || res.status === 502 || res.status === 503) {
        fail("The server timed out reaching the database. Check DATABASE_URL (pooler port 6543), wait for a redeploy, then try again.");
        return;
      }
      if (!res.ok || !data.ok) {
        fail(data.error || errorMessage(data.code) || "Sign-in failed. Try again.");
        return;
      }
      window.location.assign(data.redirect || "/app");
    } catch {
      fail("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="auth-card space-y-4" noValidate>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      {message ? (
        <p key={shakeKey} className="login-error text-sm font-medium text-red-700" role="alert">
          {message}
        </p>
      ) : null}
      {ok === "reset" ? <p className="text-sm font-medium text-lime-800">Password updated. Sign in with your new password.</p> : null}
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <button className="btn w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </button>
      <p className="text-sm">
        <Link href="/forgot-password" className="font-semibold underline">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
