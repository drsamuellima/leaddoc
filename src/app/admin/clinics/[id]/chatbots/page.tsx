import { notFound } from "next/navigation";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { DeleteChatbotButton } from "@/components/chatbot-studio/delete-chatbot-button";
import { BackLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readClinicStore } from "@/lib/store";

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
  const store = await readClinicStore(id, "chatbots");
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const bots = store.chatbots.filter((b) => b.organizationId === id);

  return (
    <div>
      <BackLink href={`/admin/clinics/${id}`}>{org.name}</BackLink>
      <PageHeader
        kicker="Chatbots"
        title={org.name}
        description="Create a lead chatbot, finish setup with AI, or jump into the studio to edit appearance and knowledge."
        action={
          <div className="flex flex-wrap gap-2">
            <form action="/api/form/adminCreateChatbot" method="post" className="flex gap-2">
              <input type="hidden" name="organizationId" value={id} />
              <input type="hidden" name="ready" value="draft" />
              <input name="name" placeholder="Chatbot name" className="w-44" />
              <button className="btn" type="submit">
                Set up with AI
              </button>
            </form>
            <form action="/api/form/adminCreateChatbot" method="post">
              <input type="hidden" name="organizationId" value={id} />
              <input type="hidden" name="name" value={`${org.name} chatbot`} />
              <button className="btn secondary" type="submit">
                Add ready chatbot
              </button>
            </form>
          </div>
        }
      />
      {ok === "deleted" ? <p className="lead-flash">Chatbot deleted.</p> : null}
      <div className="card p-2 page-enter">
        {bots.length === 0 ? (
          <EmptyState title="No chatbots" body="Set up with AI to scan the clinic site, or add a ready chatbot." />
        ) : (
          bots.map((bot) => {
            const next = bot.setupComplete ? `/app/chatbots/${bot.id}` : `/app/chatbots/${bot.id}/setup`;
            return (
              <div key={bot.id} className="list-row px-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{bot.name}</div>
                    <StatusBadge status={bot.active ? "active" : "inactive"} />
                    {!bot.setupComplete ? <span className="text-xs text-neutral-400">Setup incomplete</span> : null}
                  </div>
                  <div className="text-xs text-neutral-400">{bot.widgetKey}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ImpersonateForm organizationId={id} next={next} label="Edit" className="btn" />
                  <DeleteChatbotButton id={bot.id} name={bot.name} organizationId={id} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
