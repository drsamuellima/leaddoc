import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function ChatbotsPage() {
  const { org } = await getClinicContext();
  const store = await readStore();
  const bots = store.chatbots.filter((b) => b.organizationId === org.id);

  return (
    <div>
      <PageHeader
        kicker="Widgets"
        title="Chatbots"
        description="Build branded chats, then paste one snippet on your site."
        action={
          <form action="/api/form/createChatbot" method="post" className="flex gap-2">
            <input name="name" placeholder="New chatbot name" className="w-52" />
            <button className="btn" type="submit">
              Create
            </button>
          </form>
        }
      />
      {bots.length === 0 ? (
        <div className="card">
          <EmptyState title="No chatbots yet" body="Create one to get a widget key and snippet." />
        </div>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {bots.map((bot) => (
            <Link key={bot.id} href={`/app/chatbots/${bot.id}`} className="card lift block">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold">{bot.name}</div>
                <StatusBadge status={bot.active ? "active" : "inactive"} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{bot.greetings?.[0] || bot.greeting}</p>
              <p className="mt-4 text-xs text-neutral-400">{bot.widgetKey}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
