import { ChatbotSetupWizard } from "@/components/chatbot-setup/wizard";
import { getClinicContext } from "@/lib/auth";
import { ensureSetup } from "@/lib/chatbot-setup";
import { publicOrigin } from "@/lib/integrations";
import { setupPayload } from "@/lib/setup-state";
import { readClinicStore } from "@/lib/store";
import { notFound } from "next/navigation";

export default async function ChatbotSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await getClinicContext();
  const store = await readClinicStore(org.id);
  const bot = store.chatbots.find((b) => b.id === id && b.organizationId === org.id);
  if (!bot) notFound();
  const origin = await publicOrigin();
  const snippet = `<script src="${origin}/widget.js" data-widget-key="${bot.widgetKey}" async></script>`;
  const initial = setupPayload(store, bot);
  bot.setup = ensureSetup(bot);

  return <ChatbotSetupWizard initial={initial} snippet={snippet} />;
}
