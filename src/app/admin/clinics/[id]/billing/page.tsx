import { notFound } from "next/navigation";
import { BackLink, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { hasStripe } from "@/lib/integrations";
import { readStore } from "@/lib/store";

export default async function AdminBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const plan = store.plans.find((p) => p.active);

  return (
    <div>
      <BackLink href={`/admin/clinics/${id}`}>{org.name}</BackLink>
      <PageHeader
        kicker="Billing"
        title="Stripe & exceptions"
        description={`Status ${org.subscriptionStatus}. Stripe: ${hasStripe() ? "configured" : "demo mode"}.`}
        action={<StatusBadge status={org.subscriptionStatus} />}
      />
      {ok ? <p className="mb-4 text-sm font-medium text-lime-800">OK: {ok}</p> : null}
      {error ? <p className="mb-4 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="stagger grid gap-4 lg:grid-cols-2">
        <form action="/api/form/adminLinkStripe" method="post" className="card space-y-3">
          <h2 className="font-semibold">Link existing Stripe customer</h2>
          <input type="hidden" name="organizationId" value={id} />
          <input name="stripeCustomerId" defaultValue={org.stripeCustomerId} placeholder="cus_..." />
          <button className="btn" type="submit">
            Save customer ID
          </button>
        </form>

        <form action="/api/form/adminCreateStripeSub" method="post" className="card space-y-3">
          <h2 className="font-semibold">Create customer + subscription</h2>
          <input type="hidden" name="organizationId" value={id} />
          <p className="text-sm text-neutral-500">
            Uses the active plan ({plan?.name}, £{((plan?.amountPence || 0) / 100).toFixed(2)}/mo).
          </p>
          <button className="btn" type="submit">
            Create on Stripe
          </button>
        </form>

        <form action="/api/form/adminCharge" method="post" className="card space-y-3">
          <h2 className="font-semibold">Charge card on file</h2>
          <input type="hidden" name="organizationId" value={id} />
          <input name="amountPence" type="number" defaultValue={plan?.amountPence || 7900} />
          <p className="hint">Amount in pence. Requires a default payment method on the customer.</p>
          <button className="btn" type="submit">
            Charge
          </button>
        </form>

        <form action="/api/form/adminToggleWidgetException" method="post" className="card space-y-3">
          <input type="hidden" name="organizationId" value={id} />
          <h2 className="font-semibold">Widget exception</h2>
          <p className="text-sm text-neutral-500">
            Allow chat without an active sub: <strong>{org.allowWidgetWithoutSub ? "on" : "off"}</strong>
          </p>
          <button className="btn secondary" type="submit">
            Toggle exception
          </button>
        </form>
      </div>
    </div>
  );
}
