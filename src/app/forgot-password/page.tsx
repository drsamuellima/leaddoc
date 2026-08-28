import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <BrandLogo on="light" size="auth" />
        </div>
        <form action="/api/form/requestPasswordReset" method="post" className="auth-card space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          {ok === "sent" ? (
            <p className="text-sm font-medium text-lime-800">If that email is registered, we sent a reset link.</p>
          ) : (
            <p className="text-sm text-neutral-500">Enter your account email. We will send a reset link if it exists.</p>
          )}
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <button className="btn w-full" type="submit">
            Send reset link
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
