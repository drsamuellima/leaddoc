import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <BrandLogo size={38} />
        </div>
        <form action="/api/form/signup" method="post" className="auth-card space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Create your clinic</h1>
          {error === "exists" ? <p className="text-sm font-medium text-red-700">That email is already registered.</p> : null}
          {error === "invalid" ? (
            <p className="text-sm font-medium text-red-700">Fill all fields. Password must be 8+ characters.</p>
          ) : null}
          <div>
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" required />
          </div>
          <div>
            <label htmlFor="clinicName">Practice name</label>
            <input id="clinicName" name="clinicName" required />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={8} required />
          </div>
          <button className="btn w-full" type="submit">
            Create clinic
          </button>
          <p className="text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-black underline">
              Log in
            </Link>
          </p>
          <p className="text-xs text-neutral-500">
            By creating a clinic you agree to the{" "}
            <Link href="/terms" className="underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
