import { PageHeader } from "@/components/ui";
import { SubscriptionPanel } from "@/components/billing/subscription-panel";
import { getClinicContext } from "@/lib/auth";
import { hasStripe } from "@/lib/integrations";
import { readClinicStore } from "@/lib/store";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { org } = await getClinicContext();
  const store = await readClinicStore(org.id, "settings");
  const staff = store.profiles.filter((p) => p.organizationId === org.id);
  const plan = store.plans.find((p) => p.active) || store.plans[0];
  const { ok, error } = await searchParams;

  return (
    <div>
      <PageHeader kicker="Practice" title="Settings" description="Branding, billing, and who can work this clinic." />
      {ok ? <p className="mb-4 text-sm font-medium text-lime-800">Saved ({ok}).</p> : null}
      {error ? <p className="mb-4 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="stagger grid gap-4 lg:grid-cols-2">
        <form action="/api/form/saveBranding" method="post" className="card space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Branding</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label>Practice name</label>
              <input name="name" defaultValue={org.name} />
            </div>
            <div>
              <label>Primary colour</label>
              <input name="primaryColor" type="color" defaultValue={org.primaryColor} className="h-11 w-full p-1" />
            </div>
            <div>
              <label>Logo URL</label>
              <input name="logoUrl" defaultValue={org.logoUrl} />
            </div>
            <div>
              <label>Welcome photo URL</label>
              <input name="welcomeImageUrl" defaultValue={org.welcomeImageUrl} />
            </div>
            <div>
              <label>Practice phone</label>
              <input name="phone" defaultValue={org.phone || ""} placeholder="Used by Call buttons in the widget" />
            </div>
            <div>
              <label>Dentally / booking URL</label>
              <input
                name="bookingUrl"
                defaultValue={org.bookingUrl || ""}
                placeholder="https://your-practice.dently.app/book"
              />
              <p className="hint">Book buttons open this link unless a treatment overrides it.</p>
            </div>
          </div>
          <button className="btn" type="submit">
            Save branding
          </button>
        </form>

        <div className="lg:col-span-2">
          <SubscriptionPanel org={org} plan={plan} variant="clinic" />
          {!hasStripe() ? <p className="mt-2 text-sm text-neutral-500">Stripe keys are not set, so Checkout cannot take a real card.</p> : null}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Team</h2>
          <ul className="space-y-2 text-sm">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-2xl bg-[#f4f4f0] px-3 py-2">
                <span>
                  {s.name} · {s.email}
                </span>
                <span className="text-neutral-500">{s.role.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
          <form action="/api/form/inviteStaff" method="post" className="grid gap-2 md:grid-cols-2">
            <input name="name" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" placeholder="Temporary password (optional)" />
            <button className="btn" type="submit">
              Add staff
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
