import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="auth-card space-y-4">
        <h1 className="text-2xl font-semibold">That page is not here</h1>
        <p className="text-sm text-neutral-600">The link may be wrong, but you are not locked out. Go back to login or the admin home.</p>
        <p className="text-sm">
          <Link href="/login" className="font-semibold underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/admin" className="font-semibold underline">
            Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
