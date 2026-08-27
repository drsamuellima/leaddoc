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
        description="Set up a new chat with AI, then polish it in the studio."
        action={
          <form action="/api/form/createChatbot" method="post">
            <button className="btn" type="submit">
              Set up with AI
            </button>
          </form>
        }
      />
      {bots.length === 0 ? (
        <div className="card">
          <EmptyState title="No chatbots yet" body="Set up with AI to scan your website and build the first draft." />
        </div>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {bots.map((bot) => {
            const href = bot.setupComplete ? `/app/chatbots/${bot.id}` : `/app/chatbots/${bot.id}/setup`;
            return (
              <Link key={bot.id} href={href} className="card lift block">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{bot.name === "New chatbot" ? "Untitled chatbot" : bot.name}</div>
                  <StatusBadge status={bot.active ? "active" : "inactive"} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{bot.greetings?.[0] || bot.greeting}</p>
                <p className="mt-4 text-xs text-neutral-400">
                  {bot.setupComplete ? "Open studio" : "Continue setup"} · {bot.widgetKey}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
