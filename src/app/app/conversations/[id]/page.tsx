import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@/components/ui";
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
    <div>
      <BackLink href="/app/conversations">All conversations</BackLink>
      <PageHeader
        kicker="Conversation"
        title={lead?.name ?? "Visitor chat"}
        description={lead?.inquiry || "Widget conversation"}
        action={
          lead ? (
            <Link href={`/app/leads/${lead.id}`} className="btn secondary">
              Open lead
            </Link>
          ) : null
        }
      />
      <div className="card mx-auto max-w-2xl space-y-3 page-enter">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`}>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-60">{m.role}</div>
            <p>{m.content}</p>
          </div>
        ))}
        {messages.length === 0 ? <p className="text-sm text-neutral-500">No messages in this thread.</p> : null}
      </div>
    </div>
  );
}
