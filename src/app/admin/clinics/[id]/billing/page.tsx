import { notFound } from "next/navigation";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { SubscriptionPanel } from "@/components/billing/subscription-panel";
import { BackLink, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { hasStripe } from "@/lib/integrations";
import { listPlans, readClinicStore } from "@/lib/store";

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
  const store = await readClinicStore(id);
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const plan = store.plans.find((p) => p.active) || store.plans[0] || (await listPlans())[0];

  return (
    <div>
      <BackLink href={`/admin/clinics/${id}`}>{org.name}</BackLink>
      <PageHeader
        kicker="Billing"
        title="Subscription"
        description={`Stripe is ${hasStripe() ? "configured" : "not configured"}. Set status by hand, link a customer, or create a subscription.`}
        action={<ImpersonateForm organizationId={id} next="/app/settings" label="Clinic billing" className="btn secondary" />}
      />
      {ok ? <p className="mb-4 text-sm font-medium text-lime-800">OK: {ok}</p> : null}
      {error ? <p className="mb-4 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="mb-4">
        <SubscriptionPanel org={org} plan={plan} variant="admin" />
      </div>

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
            Uses the active plan ({plan?.name || "none"}, £{((plan?.amountPence || 0) / 100).toFixed(2)}/mo).
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
            Courtesy widget access is <strong>{org.allowWidgetWithoutSub ? "on" : "off"}</strong>. Saving subscription above also sets this.
          </p>
          <button className="btn secondary" type="submit">
            Toggle exception
          </button>
        </form>
      </div>
    </div>
  );
}
