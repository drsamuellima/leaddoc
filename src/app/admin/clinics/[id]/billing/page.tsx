import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adminChargeAction,
  adminCreateStripeSubAction,
  adminLinkStripeAction,
  adminToggleWidgetExceptionAction,
} from "@/lib/actions";
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
    <div className="space-y-6">
      <Link href={`/admin/clinics/${id}`} className="text-sm text-teal-800 underline">
        Back to {org.name}
      </Link>
      <h1 className="text-2xl font-semibold">Billing</h1>
      {ok ? <p className="text-sm text-teal-800">OK: {ok}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="text-sm text-slate-600">
        Status {org.subscriptionStatus}. Stripe configured: {hasStripe() ? "yes" : "no (demo mode)"}
      </p>

      <form action={adminLinkStripeAction} className="card space-y-3">
        <h2 className="font-semibold">Link existing Stripe customer</h2>
        <input type="hidden" name="organizationId" value={id} />
        <input name="stripeCustomerId" defaultValue={org.stripeCustomerId} placeholder="cus_..." />
        <button className="btn" type="submit">
          Save customer ID
        </button>
      </form>

      <form action={adminCreateStripeSubAction} className="card space-y-3">
        <h2 className="font-semibold">Create customer + subscription</h2>
        <input type="hidden" name="organizationId" value={id} />
        <p className="text-sm text-slate-600">Uses the active plan ({plan?.name}, £{((plan?.amountPence || 0) / 100).toFixed(2)}/mo).</p>
        <button className="btn" type="submit">
          Create on Stripe
        </button>
      </form>

      <form action={adminChargeAction} className="card space-y-3">
        <h2 className="font-semibold">Charge card on file</h2>
        <input type="hidden" name="organizationId" value={id} />
        <input name="amountPence" type="number" defaultValue={plan?.amountPence || 7900} />
        <p className="text-xs text-slate-500">Amount in pence. Requires a default payment method on the customer.</p>
        <button className="btn" type="submit">
          Charge
        </button>
      </form>

      <form action={adminToggleWidgetExceptionAction} className="card space-y-3">
        <input type="hidden" name="organizationId" value={id} />
        <p className="text-sm">Widget exception (allow chat without active sub): {org.allowWidgetWithoutSub ? "on" : "off"}</p>
        <button className="btn secondary" type="submit">
          Toggle exception
        </button>
      </form>
    </div>
  );
}
