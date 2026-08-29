import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function NewClinicPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader kicker="Platform" title="Add clinic" description="Create a practice and owner login by hand." />
      {error === "invalid" ? <p className="mb-4 text-sm font-medium text-red-700">Fill all fields. Password must be 8+ characters.</p> : null}
      {error === "exists" ? <p className="mb-4 text-sm font-medium text-red-700">That email already has an account.</p> : null}
      <form action="/api/form/adminCreateClinic" method="post" className="card max-w-lg space-y-3 page-enter">
        <div>
          <label>Practice name</label>
          <input name="clinicName" required />
        </div>
        <div>
          <label>Owner name</label>
          <input name="ownerName" required />
        </div>
        <div>
          <label>Owner email</label>
          <input name="email" type="email" required />
        </div>
        <div>
          <label>Temporary password</label>
          <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <button className="btn" type="submit">
          Create clinic
        </button>
      </form>
    </div>
  );
}
