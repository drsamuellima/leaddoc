import Link from "next/link";

export function LoginForm({ error, ok }: { error?: string; ok?: string }) {
  return (
    <form action="/api/auth/login" method="post" className="auth-card space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      {error ? <p className="text-sm font-medium text-red-700">Invalid email or password.</p> : null}
      {ok === "reset" ? <p className="text-sm font-medium text-lime-800">Password updated. Sign in with your new password.</p> : null}
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <button className="btn w-full" type="submit">
        Continue
      </button>
      <p className="text-sm">
        <Link href="/forgot-password" className="font-semibold underline">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
