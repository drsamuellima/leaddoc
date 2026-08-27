import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminClinicHub({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const staff = store.profiles.filter((p) => p.organizationId === id);
  const bots = store.chatbots.filter((b) => b.organizationId === id);
  const leads = store.leads.filter((l) => l.organizationId === id);
  const notes = store.supportNotes.filter((n) => n.organizationId === id);

  return (
    <div>
      <BackLink href="/admin">All clinics</BackLink>
      <PageHeader
        kicker={org.slug}
        title={org.name}
        description="Staff, chatbots, leads and billing for this practice."
        action={
          <>
            <StatusBadge status={org.subscriptionStatus} />
            <form action="/api/form/impersonate" method="post">
              <input type="hidden" name="organizationId" value={org.id} />
              <button className="btn" type="submit">
                Open as clinic
              </button>
            </form>
          </>
        }
      />
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
      </div>
      <div className="stagger grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Staff</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {staff.map((s) => (
              <li key={s.id} className="rounded-2xl bg-[#f4f4f0] px-3 py-2">
                {s.name} · {s.email} · {s.role.replace("_", " ")}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="font-semibold">Chatbots ({bots.length})</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {bots.map((b) => (
              <li key={b.id}>{b.name}</li>
            ))}
          </ul>
          <form action="/api/form/adminCreateChatbot" method="post" className="mt-3 flex gap-2">
            <input type="hidden" name="organizationId" value={org.id} />
            <input name="name" placeholder="New chatbot" />
            <button className="btn" type="submit">
              Add
            </button>
          </form>
        </div>
        <div className="card md:col-span-2">
          <h2 className="font-semibold">Recent leads ({leads.length})</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {leads.slice(0, 8).map((l) => (
              <li key={l.id} className="flex justify-between gap-4 border-b border-[#f0f0ea] py-2 last:border-0">
                <span className="font-medium">{l.name}</span>
                <span className="truncate text-neutral-500">{l.inquiry}</span>
              </li>
            ))}
          </ul>
        </div>
        <form action="/api/form/adminAddSupportNote" method="post" className="card space-y-3 md:col-span-2">
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
      </div>
    </div>
  );
}
