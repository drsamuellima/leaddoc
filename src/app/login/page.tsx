import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="dash-mark">D</div>
          <div>
            <div className="text-lg font-bold tracking-tight">DentChat</div>
            <div className="text-sm text-neutral-500">Clinic &amp; admin sign in</div>
          </div>
        </div>
        <LoginForm error={error} />
        <p className="mt-5 text-sm text-neutral-500">
          Demo clinic: clinic@dentchat.local / password
          <br />
          Platform admin: admin@dentchat.local / password
        </p>
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
