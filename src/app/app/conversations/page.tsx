import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { readClinicStore } from "@/lib/store";

export default async function ConversationsPage() {
  const { org } = await getClinicContext();
  const store = await readClinicStore(org.id);
  const convos = store.conversations
    .filter((c) => c.organizationId === org.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        kicker="Inbox"
        title="Conversations"
        description="Every visitor chat, linked to the lead when they leave details."
      />
      <div className="card p-2 page-enter">
        {convos.length === 0 ? (
          <EmptyState title="No conversations" body="Chats appear here once someone uses your widget." />
        ) : (
          convos.map((c) => {
            const lead = store.leads.find((l) => l.id === c.leadId);
            return (
              <Link key={c.id} href={`/app/conversations/${c.id}`} className="list-row rounded-2xl px-3 hover:bg-[#fafaf7]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-bold">
                  {(lead?.name || "V")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{lead?.name ?? "Visitor"}</div>
                  <div className="truncate text-sm text-neutral-500">{lead?.inquiry || "No enquiry yet"}</div>
                </div>
                <span className="text-xs text-neutral-400">{c.createdAt.slice(0, 10)}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
