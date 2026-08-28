import type { Chatbot, StoreData } from "./types";
import { checklistScore, deriveChecklist, ensureSetup } from "./chatbot-setup";
import { getClinicContext } from "./auth";
import { hasGemini } from "./integrations";
import { readStore } from "./store";

export function setupPayload(data: StoreData, bot: Chatbot) {
  bot.setup = ensureSetup(bot);
  const options = data.chatbotOptions.filter((o) => o.chatbotId === bot.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const faqs = data.knowledgeItems.filter((k) => k.chatbotId === bot.id);
  bot.setup.checklist = deriveChecklist(bot, options, faqs);
  return {
    bot,
    options,
    faqs,
    checklist: bot.setup.checklist,
    score: checklistScore(bot.setup.checklist),
    aiEnabled: hasGemini(),
  };
}

export async function loadOwnedBot(id: string) {
  const { org } = await getClinicContext();
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.id === id && b.organizationId === org.id);
  if (!bot) return null;
  return { org, store, bot };
}
