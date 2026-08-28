import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <BrandLogo size={38} />
          <div className="mt-2 text-sm text-neutral-500">Clinic &amp; admin sign in</div>
        </div>
        <LoginForm error={error} ok={ok} />
        <p className="mt-3 text-sm">
          New practice?{" "}
          <Link href="/signup" className="font-semibold underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
