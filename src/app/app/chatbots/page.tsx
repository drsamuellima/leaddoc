import Link from "next/link";
import { createChatbotAction } from "@/lib/actions";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function ChatbotsPage() {
  const { org } = await getClinicContext();
  const store = await readStore();
  const bots = store.chatbots.filter((b) => b.organizationId === org.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chatbots</h1>
        <form action={createChatbotAction} className="flex gap-2">
          <input name="name" placeholder="New chatbot name" className="w-56" />
          <button className="btn" type="submit">
            Create
          </button>
        </form>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {bots.map((bot) => (
          <Link key={bot.id} href={`/app/chatbots/${bot.id}`} className="card block hover:border-teal-300">
            <div className="font-semibold">{bot.name}</div>
            <p className="mt-1 text-sm text-slate-600">{bot.greetings?.[0] || bot.greeting}</p>
            <p className="mt-2 text-xs text-slate-500">{bot.active ? "Active" : "Paused"} · {bot.widgetKey}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
