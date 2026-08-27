import Link from "next/link";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function ConversationsPage() {
  const { org } = await getClinicContext();
  const store = await readStore();
  const convos = store.conversations
    .filter((c) => c.organizationId === org.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Conversations</h1>
      <ul className="card divide-y p-0">
        {convos.map((c) => {
          const lead = store.leads.find((l) => l.id === c.leadId);
          return (
            <li key={c.id}>
              <Link href={`/app/conversations/${c.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <div className="font-medium">{lead?.name ?? "Visitor"}</div>
                <div className="text-sm text-slate-500">{lead?.inquiry}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
