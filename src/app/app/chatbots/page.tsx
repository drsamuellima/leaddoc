import Link from "next/link";
import { CreateChatbotButton } from "@/components/chatbot-setup/create-chatbot-button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { DeleteChatbotButton } from "@/components/chatbot-studio/delete-chatbot-button";
import { getClinicContext } from "@/lib/auth";
import { listClinicChatbots } from "@/lib/store";
import type { Chatbot } from "@/lib/types";

export default async function ChatbotsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const { org } = await getClinicContext();
  let bots: Chatbot[] = [];
  let loadError = false;
  try {
    bots = await listClinicChatbots(org.id);
  } catch {
    loadError = true;
  }

  return (
    <div>
      <PageHeader
        kicker="Widgets"
        title="Chatbots"
        description="Set up a new chat with AI, then polish it in the studio."
        action={<CreateChatbotButton />}
      />
      {ok === "deleted" ? <p className="lead-flash">Chatbot deleted. Patient leads were kept.</p> : null}
      {loadError ? <p className="lead-flash">Could not refresh chatbots. Try again.</p> : null}
      {!loadError && bots.length === 0 ? (
        <div className="card">
          <EmptyState title="No chatbots yet" body="Set up with AI to scan your website and build the first draft." />
        </div>
      ) : bots.length === 0 ? null : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {bots.map((bot) => {
            const href = bot.setupComplete ? `/app/chatbots/${bot.id}` : `/app/chatbots/${bot.id}/setup`;
            const title = bot.name === "New chatbot" ? "Untitled chatbot" : bot.name;
            return (
              <article key={bot.id} className="card">
                <Link href={href} className="lift block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{title}</div>
                    <StatusBadge status={bot.active ? "active" : "inactive"} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{bot.greetings?.[0] || bot.greeting}</p>
                  <p className="mt-4 text-xs text-neutral-400">
                    {bot.setupComplete ? "Open studio" : "Continue setup"} · {bot.widgetKey}
                  </p>
                </Link>
                <div className="mt-3 flex justify-end border-t border-neutral-100 pt-3">
                  <DeleteChatbotButton id={bot.id} name={bot.name} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
