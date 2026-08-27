import { ChatbotStudio } from "@/components/chatbot-studio/studio";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { publicOrigin } from "@/lib/integrations";
import { readStore } from "@/lib/store";
import { widgetTheme } from "@/lib/widget";
import { notFound, redirect } from "next/navigation";

export default async function ChatbotEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const { org } = await getClinicContext();
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.id === id && b.organizationId === org.id);
  if (!bot) notFound();
  if (!bot.setupComplete) redirect(`/app/chatbots/${id}/setup`);
  const options = store.chatbotOptions.filter((o) => o.chatbotId === bot.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const faqs = store.knowledgeItems.filter((k) => k.chatbotId === bot.id);
  const origin = await publicOrigin();
  const snippet = `<script src="${origin}/widget.js" data-widget-key="${bot.widgetKey}" async></script>`;
  const greetingsText = (bot.greetings?.length ? bot.greetings : [bot.greeting]).join("\n");
  const theme = widgetTheme(org, bot);

  return (
    <div className="space-y-3 chatbot-studio-page">
      <PageHeader
        kicker="Chatbot studio"
        title={bot.name}
        description="Dense editor: skins, colours, fonts, treatments, and knowledge. Every skin shares lead, book, call, and chat."
        action={<StatusBadge status={bot.active ? "active" : "inactive"} />}
      />
      <ChatbotStudio
        bot={bot}
        org={org}
        options={options}
        faqs={faqs}
        snippet={snippet}
        greetingsText={greetingsText}
        initial={theme}
        previewBase={`/w/${encodeURIComponent(bot.widgetKey)}?preview=1`}
        saved={ok === "saved"}
      />
    </div>
  );
}
