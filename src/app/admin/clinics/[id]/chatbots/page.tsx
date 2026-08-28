import { notFound } from "next/navigation";
import { BackLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { DeleteChatbotButton } from "@/components/chatbot-studio/delete-chatbot-button";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminChatbotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { ok } = await searchParams;
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const bots = store.chatbots.filter((b) => b.organizationId === id);

  return (
    <div>
      <BackLink href={`/admin/clinics/${id}`}>{org.name}</BackLink>
      <PageHeader
        kicker="Chatbots"
        title={org.name}
        description="Open as clinic to edit prompt, FAQs, options and widget code."
        action={
          <form action="/api/form/adminCreateChatbot" method="post" className="flex gap-2">
            <input type="hidden" name="organizationId" value={id} />
            <input name="name" placeholder="Chatbot name" className="w-44" />
            <button className="btn" type="submit">
              Add
            </button>
          </form>
        }
      />
      {ok === "deleted" ? <p className="lead-flash">Chatbot deleted.</p> : null}
      <div className="card p-2 page-enter">
        {bots.length === 0 ? (
          <EmptyState title="No chatbots" body="Add one for this clinic." />
        ) : (
          bots.map((bot) => (
            <div key={bot.id} className="list-row px-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{bot.name}</div>
                  <StatusBadge status={bot.active ? "active" : "inactive"} />
                </div>
                <div className="text-xs text-neutral-400">{bot.widgetKey}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action="/api/form/impersonate" method="post">
                  <input type="hidden" name="organizationId" value={id} />
                  <button className="btn secondary" type="submit">
                    Edit in clinic UI
                  </button>
                </form>
                <DeleteChatbotButton id={bot.id} name={bot.name} organizationId={id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
