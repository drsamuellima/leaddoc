import Link from "next/link";
import { signupAction } from "@/lib/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form action={signupAction} className="card w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Create your clinic</h1>
        {error === "exists" ? <p className="text-sm text-red-700">That email is already registered.</p> : null}
        {error === "invalid" ? <p className="text-sm text-red-700">Fill all fields. Password must be 8+ characters.</p> : null}
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
        <p className="text-sm">
          Already have an account? <Link href="/login" className="text-teal-800 underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
