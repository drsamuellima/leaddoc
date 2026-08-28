import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <BrandLogo on="light" size="auth" />
        </div>
        <form action="/api/form/resetPassword" method="post" className="auth-card space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          {error === "invalid" ? <p className="text-sm font-medium text-red-700">Password must be 8+ characters.</p> : null}
          {error === "expired" ? <p className="text-sm font-medium text-red-700">That reset link is invalid or expired.</p> : null}
          {!token ? <p className="text-sm font-medium text-red-700">Missing reset token. Use the link from your email.</p> : null}
          <input type="hidden" name="token" value={token || ""} />
          <div>
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
          </div>
          <button className="btn w-full" type="submit" disabled={!token}>
            Update password
          </button>
          <p className="text-sm">
            <Link href="/login" className="font-semibold underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
