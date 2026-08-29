import Link from "next/link";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { SubscriptionPanel } from "@/components/billing/subscription-panel";
import { BackLink, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listPlans, readClinicStore } from "@/lib/store";
import { notFound } from "next/navigation";

export default async function AdminClinicHub({
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
  const staff = store.profiles.filter((p) => p.organizationId === id);
  const bots = store.chatbots.filter((b) => b.organizationId === id);
  const leads = [...store.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const notes = store.supportNotes.filter((n) => n.organizationId === id);
  const plan = store.plans.find((p) => p.active) || store.plans[0] || (await listPlans())[0];

  return (
    <div>
      <BackLink href="/admin">All clinics</BackLink>
      <PageHeader
        kicker={org.slug}
        title={org.name}
        description="Full clinic access: chatbots, leads, settings, billing. Open as clinic to use the same workspace they see."
        action={
          <>
            <StatusBadge status={org.subscriptionStatus} />
            <ImpersonateForm organizationId={org.id} label="Open as clinic" />
          </>
        }
      />
      {ok === "access" ? <p className="mb-4 text-sm font-medium text-lime-800">Subscription saved.</p> : null}
      {ok === "branding" ? <p className="mb-4 text-sm font-medium text-lime-800">Account settings saved.</p> : null}
      {ok === "staff" ? <p className="mb-4 text-sm font-medium text-lime-800">Staff added.</p> : null}
      {error === "invalid" ? <p className="mb-4 text-sm font-medium text-red-700">Name and email are required.</p> : null}
      {error === "exists" ? <p className="mb-4 text-sm font-medium text-red-700">That email already has an account.</p> : null}
      {error === "confirm" ? <p className="mb-4 text-sm font-medium text-red-700">Type DELETE to remove this clinic.</p> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Link className="btn secondary" href={`/admin/clinics/${id}/chatbots`}>
          Chatbots
        </Link>
        <Link className="btn secondary" href={`/admin/clinics/${id}/leads`}>
          Leads
        </Link>
        <Link className="btn secondary" href={`/admin/clinics/${id}/billing`}>
          Billing
        </Link>
        <ImpersonateForm organizationId={id} next="/app/settings" label="Clinic settings" className="btn secondary" />
        <ImpersonateForm organizationId={id} next="/app/pipelines" label="Pipelines" className="btn secondary" />
      </div>

      <div className="mb-4">
        <SubscriptionPanel org={org} plan={plan} variant="admin" />
      </div>

      <div className="stagger mb-4 grid gap-4 lg:grid-cols-2">
        <form action="/api/form/adminSaveBranding" method="post" className="card space-y-3">
          <h2 className="font-semibold">Account & branding</h2>
          <p className="text-sm text-neutral-500">Same settings the clinic owner has. Saving here updates the live account.</p>
          <input type="hidden" name="organizationId" value={org.id} />
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
              <input name="phone" defaultValue={org.phone || ""} />
            </div>
            <div>
              <label>Booking URL</label>
              <input name="bookingUrl" defaultValue={org.bookingUrl || ""} />
            </div>
          </div>
          <button className="btn" type="submit">
            Save account
          </button>
        </form>

        <div className="card space-y-3">
          <h2 className="font-semibold">Team</h2>
          <ul className="space-y-2 text-sm">
            {staff.map((s) => (
              <li key={s.id} className="rounded-2xl bg-[#f4f4f0] px-3 py-2">
                {s.name} · {s.email} · {s.role.replace("_", " ")}
              </li>
            ))}
          </ul>
          <form action="/api/form/adminInviteStaff" method="post" className="grid gap-2 md:grid-cols-2">
            <input type="hidden" name="organizationId" value={org.id} />
            <input name="name" placeholder="Name" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" placeholder="Temporary password (optional)" />
            <button className="btn" type="submit">
              Add staff
            </button>
          </form>
        </div>
      </div>

      <div className="stagger mb-4 grid gap-4 md:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Chatbots ({bots.length})</h2>
            <Link href={`/admin/clinics/${id}/chatbots`} className="text-sm font-medium text-neutral-500">
              Manage
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {bots.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span>{b.name}</span>
                <StatusBadge status={b.active ? "active" : "inactive"} />
              </li>
            ))}
          </ul>
          <form action="/api/form/adminCreateChatbot" method="post" className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="organizationId" value={org.id} />
            <input type="hidden" name="ready" value="draft" />
            <input name="name" placeholder="New lead chatbot" />
            <button className="btn" type="submit">
              Set up with AI
            </button>
          </form>
        </div>
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Recent leads ({leads.length})</h2>
            <Link href={`/admin/clinics/${id}/leads`} className="text-sm font-medium text-neutral-500">
              View all
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {leads.slice(0, 8).map((l) => (
              <li key={l.id} className="flex justify-between gap-4 border-b border-[#f0f0ea] py-2 last:border-0">
                <span className="font-medium">{l.name}</span>
                <span className="truncate text-neutral-500">{l.inquiry}</span>
              </li>
            ))}
            {leads.length === 0 ? <li className="text-neutral-500">No leads yet.</li> : null}
          </ul>
        </div>
      </div>

      <div className="stagger grid gap-4 md:grid-cols-2">
        <form action="/api/form/adminAddSupportNote" method="post" className="card space-y-3">
          <h2 className="font-semibold">Internal support notes</h2>
          <ul className="text-sm">
            {notes.map((n) => (
              <li key={n.id} className="border-b border-[#f0f0ea] py-2">
                {n.body}
                <div className="text-xs text-neutral-400">{n.createdAt}</div>
              </li>
            ))}
          </ul>
          <input type="hidden" name="organizationId" value={org.id} />
          <textarea name="body" rows={3} required placeholder="Note visible only to platform admins" />
          <button className="btn" type="submit">
            Add note
          </button>
        </form>
        <form action="/api/form/adminDeleteClinic" method="post" className="card space-y-3">
          <h2 className="font-semibold">Delete clinic</h2>
          <p className="text-sm text-neutral-500">Removes the practice, staff, bots, and leads. Type DELETE to confirm.</p>
          <input type="hidden" name="organizationId" value={org.id} />
          <input name="confirm" placeholder="DELETE" required />
          <button className="btn" type="submit">
            Delete clinic
          </button>
        </form>
      </div>
    </div>
  );
}
