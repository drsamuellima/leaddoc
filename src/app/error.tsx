"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-card space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="login-error text-sm font-medium text-red-700" role="alert">
          {error.message || "The page could not load. This is not a missing page."}
        </p>
        <button className="btn" type="button" onClick={() => reset()}>
          Try again
        </button>
        <p className="text-sm">
          <a href="/login" className="font-semibold underline">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
