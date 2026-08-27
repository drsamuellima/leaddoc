import { inviteStaffAction, saveBrandingAction, startCheckoutAction } from "@/lib/actions";
import { getClinicContext } from "@/lib/auth";
import { hasStripe } from "@/lib/integrations";
import { readStore } from "@/lib/store";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { org } = await getClinicContext();
  const store = await readStore();
  const staff = store.profiles.filter((p) => p.organizationId === org.id);
  const { ok, error } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {ok ? <p className="text-sm text-teal-800">Saved ({ok}).</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <form action={saveBrandingAction} className="card space-y-3">
        <h2 className="font-semibold">Branding</h2>
        <div>
          <label>Practice name</label>
          <input name="name" defaultValue={org.name} />
        </div>
        <div>
          <label>Primary colour</label>
          <input name="primaryColor" type="color" defaultValue={org.primaryColor} className="h-10 w-20 p-1" />
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
          <p className="mt-1 text-xs text-slate-500">Book buttons open this link in a new tab unless a treatment overrides it.</p>
        </div>
        <button className="btn" type="submit">
          Save branding
        </button>
      </form>

      <div className="card space-y-3">
        <h2 className="font-semibold">Billing</h2>
        <p className="text-sm text-slate-600">
          Status: {org.subscriptionStatus}
          {hasStripe() ? "" : " (Stripe keys not set — subscribe will activate locally)"}
        </p>
        <form action={startCheckoutAction}>
          <button className="btn" type="submit">
            Subscribe monthly
          </button>
        </form>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Team</h2>
        <ul className="text-sm">
          {staff.map((s) => (
            <li key={s.id}>
              {s.name} · {s.email} · {s.role}
            </li>
          ))}
        </ul>
        <form action={inviteStaffAction} className="grid gap-2 md:grid-cols-4">
          <input name="name" placeholder="Name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" placeholder="Temp password" defaultValue="password" />
          <button className="btn" type="submit">
            Add staff
          </button>
        </form>
      </div>
    </div>
  );
}
