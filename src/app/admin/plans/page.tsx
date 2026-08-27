import { adminSavePlanAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function PlansPage() {
  await requireAdmin();
  const store = await readStore();
  const plan = store.plans[0];

  return (
    <form action={adminSavePlanAction} className="card max-w-lg space-y-3">
      <h1 className="text-xl font-semibold">Plans</h1>
      <input type="hidden" name="id" value={plan?.id || ""} />
      <div>
        <label>Name</label>
        <input name="name" defaultValue={plan?.name} />
      </div>
      <div>
        <label>Amount (pence / month)</label>
        <input name="amountPence" type="number" defaultValue={plan?.amountPence} />
      </div>
      <div>
        <label>Stripe Price ID (optional)</label>
        <input name="stripePriceId" defaultValue={plan?.stripePriceId} placeholder="price_..." />
      </div>
      <label className="flex items-center gap-2 font-normal">
        <input type="checkbox" name="active" defaultChecked={plan?.active} className="w-auto" /> Active
      </label>
      <button className="btn" type="submit">
        Save plan
      </button>
    </form>
  );
}
