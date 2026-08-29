import type { Organization, Plan, SubscriptionStatus } from "@/lib/types";

const STATUS_COPY: Record<
  SubscriptionStatus,
  { title: string; body: string; tone: "live" | "trial" | "off" | "warn" | "ended" }
> = {
  active: {
    title: "Live subscription",
    body: "The widget can run on the clinic website and the practice is billed monthly.",
    tone: "live",
  },
  trialing: {
    title: "Trial",
    body: "The clinic is in a trial. The widget behaves as if they are subscribed.",
    tone: "trial",
  },
  inactive: {
    title: "Not subscribed",
    body: "The public widget stays off unless you allow it without payment.",
    tone: "off",
  },
  past_due: {
    title: "Payment failed",
    body: "The last invoice did not go through. The widget stays gated until this is cleared.",
    tone: "warn",
  },
  canceled: {
    title: "Canceled",
    body: "This plan has ended. Reactivate from here or send them back through Checkout.",
    tone: "ended",
  },
};

function gbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

const STATUSES: SubscriptionStatus[] = ["inactive", "trialing", "active", "past_due", "canceled"];

export function SubscriptionPanel({
  org,
  plan,
  variant,
}: {
  org: Organization;
  plan?: Plan | null;
  variant: "admin" | "clinic";
}) {
  const copy = STATUS_COPY[org.subscriptionStatus];
  const widgetOn = org.subscriptionStatus === "active" || org.subscriptionStatus === "trialing" || org.allowWidgetWithoutSub;

  return (
    <section className={`sub-panel sub-panel-${copy.tone}`}>
      <div className="sub-panel-hero">
        <div>
          <p className="sub-kicker">LeadDoc subscription</p>
          <h2>{copy.title}</h2>
          <p className="sub-lead">{copy.body}</p>
        </div>
        <div className="sub-price">
          <span>{plan ? gbp(plan.amountPence) : "—"}</span>
          <small>{plan ? `${plan.name} / month` : "No plan set"}</small>
        </div>
      </div>

      <div className="sub-chips">
        <span className={`sub-chip ${widgetOn ? "on" : "off"}`}>{widgetOn ? "Widget allowed" : "Widget blocked"}</span>
        {org.allowWidgetWithoutSub ? <span className="sub-chip on">Courtesy access</span> : null}
        {org.stripeCustomerId ? <span className="sub-chip">Stripe customer</span> : <span className="sub-chip off">No Stripe customer</span>}
      </div>

      {variant === "admin" ? (
        <>
          <form action="/api/form/adminSetSubscription" method="post" className="sub-admin-form">
            <input type="hidden" name="organizationId" value={org.id} />
            <div className="sub-status-grid">
              {STATUSES.map((status) => (
                <label key={status} className={`sub-status-option ${org.subscriptionStatus === status ? "selected" : ""}`}>
                  <input type="radio" name="subscriptionStatus" value={status} defaultChecked={org.subscriptionStatus === status} />
                  <strong>{STATUS_COPY[status].title}</strong>
                  <span>{status.replace("_", " ")}</span>
                </label>
              ))}
            </div>
            <label className="sub-toggle">
              <input type="checkbox" name="allowWidgetWithoutSub" defaultChecked={org.allowWidgetWithoutSub} />
              Allow the widget without a paid subscription
            </label>
            <button className="btn" type="submit">
              Save subscription
            </button>
          </form>
          <dl className="sub-meta">
            <div>
              <dt>Customer</dt>
              <dd>{org.stripeCustomerId || "—"}</dd>
            </div>
            <div>
              <dt>Subscription</dt>
              <dd>{org.stripeSubscriptionId || "—"}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="sub-clinic-actions">
          <form action="/api/form/checkout" method="post">
            <button className="btn" type="submit">
              Subscribe monthly
            </button>
          </form>
          {org.stripeCustomerId ? (
            <form action="/api/form/billingPortal" method="post">
              <button className="btn secondary" type="submit">
                Manage billing
              </button>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}
