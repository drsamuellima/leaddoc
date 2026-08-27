import Link from "next/link";
import { loginAction } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form action={loginAction} className="card w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Log in to DentChat</h1>
        {error ? <p className="text-sm text-red-700">Invalid email or password.</p> : null}
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
        <p className="text-sm text-slate-600">
          Demo clinic: clinic@dentchat.local / password
          <br />
          Platform admin: admin@dentchat.local / password
        </p>
        <p className="text-sm">
          New practice? <Link href="/signup" className="text-teal-800 underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
