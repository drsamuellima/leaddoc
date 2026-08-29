import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listPlans } from "@/lib/store";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireAdmin();
  const { ok } = await searchParams;
  const plans = await listPlans();
  const plan = plans[0];
  const amount = ((plan?.amountPence || 0) / 100).toFixed(2);

  return (
    <div>
      <PageHeader
        kicker="Billing"
        title="Plans"
        description="The monthly LeadDoc plan clinics subscribe to. This is what Checkout and admin-created Stripe subscriptions use."
      />
      {ok === "saved" ? <p className="mb-4 text-sm font-medium text-lime-800">Plan saved.</p> : null}

      <div className="plan-showcase page-enter mb-5">
        <div>
          <p className="sub-kicker" style={{ color: "rgb(17 17 17 / 0.45)" }}>
            Current plan
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{plan?.name || "No plan"}</h2>
          <p className="mt-1 text-sm text-neutral-500">Billed in GBP. Widget access follows the clinic’s subscription status.</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold tracking-tight">£{amount}</div>
          <div className="text-sm text-neutral-500">per month</div>
        </div>
      </div>

      <form action="/api/form/adminSavePlan" method="post" className="card max-w-lg space-y-3">
        <input type="hidden" name="id" value={plan?.id || ""} />
        <div>
          <label>Name</label>
          <input name="name" defaultValue={plan?.name} />
        </div>
        <div>
          <label>Amount (pence / month)</label>
          <input name="amountPence" type="number" defaultValue={plan?.amountPence} />
          <p className="hint">Shown to clinics as £{amount}. 7900 pence is £79.00.</p>
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
