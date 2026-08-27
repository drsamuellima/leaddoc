import Link from "next/link";
import { notFound } from "next/navigation";
import { adminCreateChatbotAction, impersonateAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminChatbotsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const bots = store.chatbots.filter((b) => b.organizationId === id);

  return (
    <div className="space-y-4">
      <Link href={`/admin/clinics/${id}`} className="text-sm text-teal-800 underline">
        Back to {org.name}
      </Link>
      <h1 className="text-2xl font-semibold">Chatbots</h1>
      <p className="text-sm text-slate-600">
        Open as clinic to edit prompt, FAQs, options and widget code with full clinic tools.
      </p>
      <form action={adminCreateChatbotAction} className="flex gap-2">
        <input type="hidden" name="organizationId" value={id} />
        <input name="name" placeholder="Chatbot name" />
        <button className="btn" type="submit">
          Add chatbot
        </button>
      </form>
      <ul className="card divide-y p-0">
        {bots.map((bot) => (
          <li key={bot.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">{bot.name}</div>
              <div className="text-xs text-slate-500">{bot.widgetKey}</div>
            </div>
            <form action={impersonateAction}>
              <input type="hidden" name="organizationId" value={id} />
              <button className="btn secondary" type="submit">
                Edit in clinic UI
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
