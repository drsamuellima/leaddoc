import { adminCreateClinicAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";

export default async function NewClinicPage() {
  await requireAdmin();
  return (
    <form action={adminCreateClinicAction} className="card max-w-lg space-y-3">
      <h1 className="text-xl font-semibold">Add clinic manually</h1>
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
  );
}
