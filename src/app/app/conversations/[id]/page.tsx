import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await getClinicContext();
  const store = await readStore();
  const convo = store.conversations.find((c) => c.id === id && c.organizationId === org.id);
  if (!convo) notFound();
  const lead = store.leads.find((l) => l.id === convo.leadId);
  const messages = store.messages.filter((m) => m.conversationId === id);

  return (
    <div className="card space-y-4">
      <h1 className="text-xl font-semibold">{lead?.name ?? "Conversation"}</h1>
      {lead ? (
        <Link href={`/app/leads/${lead.id}`} className="text-sm text-teal-800 underline">
          Open lead
        </Link>
      ) : null}
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="text-xs uppercase text-slate-400">{m.role}</div>
            <p className="mt-1">{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
