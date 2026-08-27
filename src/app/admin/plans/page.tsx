import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function PlansPage() {
  await requireAdmin();
  const store = await readStore();
  const plan = store.plans[0];

  return (
    <div>
      <PageHeader kicker="Billing" title="Plans" description="The monthly plan clinics subscribe to." />
      <form action="/api/form/adminSavePlan" method="post" className="card max-w-lg space-y-3 page-enter">
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
    </div>
  );
}
