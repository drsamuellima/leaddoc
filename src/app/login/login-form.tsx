export function LoginForm({ error }: { error?: string }) {
  return (
    <form action="/api/auth/login" method="post" className="auth-card space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      {error ? <p className="text-sm font-medium text-red-700">Invalid email or password.</p> : null}
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required defaultValue="clinic@dentchat.local" />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required defaultValue="password" />
      </div>
      <button className="btn w-full" type="submit">
        Continue
      </button>
    </form>
  );
}
