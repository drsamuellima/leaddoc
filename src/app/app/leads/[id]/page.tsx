import Link from "next/link";
import { notFound } from "next/navigation";
import { updateLeadAction } from "@/lib/actions";
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
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={updateLeadAction} className="card space-y-3">
        <h1 className="text-xl font-semibold">{lead.name}</h1>
        <input type="hidden" name="id" value={lead.id} />
        <p className="text-sm text-slate-600">
          {lead.email} · {lead.phone}
        </p>
        <p className="text-sm">{lead.inquiry}</p>
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
        <button className="btn" type="submit">
          Save lead
        </button>
        <Link href={`/app/conversations/${lead.conversationId}`} className="block text-sm text-teal-800 underline">
          Open conversation
        </Link>
      </form>
      <div className="card space-y-3">
        <h2 className="font-semibold">Chat transcript</h2>
        <div className="space-y-2 text-sm">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-slate-900" : "text-teal-900"}>
              <span className="text-xs uppercase text-slate-400">{m.role}</span>
              <p>{m.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
