import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, PageHeader, StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await getClinicContext();
  const store = await readStore();
  const lead = store.leads.find((l) => l.id === id && l.organizationId === org.id);
  if (!lead) notFound();
  const staff = store.profiles.filter((p) => p.organizationId === org.id);
  const messages = store.messages.filter((m) => m.conversationId === lead.conversationId);

  return (
    <div>
      <BackLink href="/app/leads">All leads</BackLink>
      <PageHeader
        kicker="Lead"
        title={lead.name}
        description={`${lead.email} · ${lead.phone}`}
        action={<StatusBadge status={lead.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <form action="/api/form/updateLead" method="post" className="card space-y-3 page-enter">
          <input type="hidden" name="id" value={lead.id} />
          <p className="rounded-2xl bg-[#f4f4f0] p-3 text-sm">{lead.inquiry}</p>
          <div>
            <label>Status</label>
            <select name="status" defaultValue={lead.status}>
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="booked">booked</option>
              <option value="closed">closed</option>
            </select>
          </div>
          <div>
            <label>Assign staff</label>
            <select name="assignedTo" defaultValue={lead.assignedTo || ""}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Follow-up</label>
            <input type="datetime-local" name="followUpAt" defaultValue={lead.followUpAt?.slice(0, 16) || ""} />
          </div>
          <div>
            <label>Notes</label>
            <textarea name="notes" rows={4} defaultValue={lead.notes} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" type="submit">
              Save lead
            </button>
            <Link href={`/app/conversations/${lead.conversationId}`} className="btn secondary">
              Open conversation
            </Link>
          </div>
        </form>
        <div className="card space-y-3 page-enter">
          <h2 className="font-semibold">Chat transcript</h2>
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-60">{m.role}</div>
                <p>{m.content}</p>
              </div>
            ))}
            {messages.length === 0 ? <p className="text-sm text-neutral-500">No messages stored for this lead yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
