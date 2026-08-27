import Link from "next/link";
import { notFound } from "next/navigation";
import {
  adminAddSupportNoteAction,
  adminCreateChatbotAction,
  impersonateAction,
} from "@/lib/actions";
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <p className="text-sm text-slate-600">
            {org.subscriptionStatus} · {org.slug}
          </p>
        </div>
        <form action={impersonateAction}>
          <input type="hidden" name="organizationId" value={org.id} />
          <button className="btn" type="submit">
            Open as clinic
          </button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Staff</h2>
          <ul className="mt-2 text-sm">
            {staff.map((s) => (
              <li key={s.id}>
                {s.name} · {s.email} · {s.role}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="font-semibold">Chatbots ({bots.length})</h2>
          <ul className="mt-2 text-sm">
            {bots.map((b) => (
              <li key={b.id}>{b.name}</li>
            ))}
          </ul>
          <form action={adminCreateChatbotAction} className="mt-3 flex gap-2">
            <input type="hidden" name="organizationId" value={org.id} />
            <input name="name" placeholder="New chatbot" />
            <button className="btn" type="submit">
              Add
            </button>
          </form>
        </div>
      </div>
      <div className="card">
        <h2 className="font-semibold">Recent leads ({leads.length})</h2>
        <ul className="mt-2 text-sm">
          {leads.slice(0, 8).map((l) => (
            <li key={l.id}>
              {l.name} — {l.inquiry}
            </li>
          ))}
        </ul>
      </div>
      <form action={adminAddSupportNoteAction} className="card space-y-3">
        <h2 className="font-semibold">Internal support notes</h2>
        <ul className="text-sm">
          {notes.map((n) => (
            <li key={n.id} className="border-b py-2">
              {n.body}
              <div className="text-xs text-slate-400">{n.createdAt}</div>
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
  );
}
