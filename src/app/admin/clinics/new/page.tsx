import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function NewClinicPage() {
  await requireAdmin();
  return (
    <div>
      <PageHeader kicker="Platform" title="Add clinic" description="Create a practice and owner login by hand." />
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
          <input name="password" defaultValue="password" />
        </div>
        <button className="btn" type="submit">
          Create clinic
        </button>
      </form>
    </div>
  );
}
