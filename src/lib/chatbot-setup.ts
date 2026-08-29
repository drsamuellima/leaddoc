import type {
  Chatbot,
  ChatbotOption,
  ChatbotSetup,
  KnowledgeItem,
  SetupChecklist,
  SetupExtract,
  SetupFaqDraft,
  SetupStep,
  SetupTreatmentDraft,
} from "./types";
import { parseActionType } from "./types";

export function emptyChecklist(): SetupChecklist {
  return {
    website: false,
    knowledge: false,
    name: false,
    phone: false,
    booking: false,
    greetings: false,
    treatments: false,
    prompt: false,
  };
}

export function emptyExtract(): SetupExtract {
  return {
    name: "",
    phone: "",
    bookingUrl: "",
    avatarName: "",
    greetings: [],
    systemPrompt: "",
    faqs: [],
    treatments: [],
    pages: [],
  };
}

export function emptySetup(step: SetupStep = "website"): ChatbotSetup {
  return {
    step,
    websiteUrl: "",
    scanStatus: "idle",
    scanError: "",
    pendingExtract: null,
    interview: [],
    confirmed: {},
    checklist: emptyChecklist(),
  };
}

export function completedSetup(bot: Pick<Chatbot, "phone" | "bookingUrl">): ChatbotSetup {
  return {
    step: "live",
    websiteUrl: "",
    scanStatus: "ready",
    scanError: "",
    pendingExtract: null,
    interview: [],
    confirmed: { name: true, phone: Boolean((bot.phone || "").trim()), booking: Boolean((bot.bookingUrl || "").trim()), treatments: true },
    checklist: {
      website: true,
      knowledge: true,
      name: true,
      phone: Boolean((bot.phone || "").trim()),
      booking: Boolean((bot.bookingUrl || "").trim()),
      greetings: true,
      treatments: true,
      prompt: true,
    },
  };
}

export function ensureSetup(bot: Chatbot): ChatbotSetup {
  if (bot.setup && typeof bot.setup === "object") {
    return {
      ...emptySetup(),
      ...bot.setup,
      step: parseSetupStep(String(bot.setup.step || "website")),
      checklist: { ...emptyChecklist(), ...(bot.setup.checklist || {}) },
      interview: Array.isArray(bot.setup.interview) ? bot.setup.interview : [],
      confirmed: { ...(bot.setup.confirmed || {}) },
    };
  }
  return emptySetup();
}

export function deriveChecklist(
  bot: Chatbot,
  options: ChatbotOption[],
  _faqs: KnowledgeItem[],
): SetupChecklist {
  const setup = ensureSetup(bot);
  const greetings = (bot.greetings || []).map((g) => g.trim()).filter(Boolean);
  const prompt = (bot.systemPrompt || "").trim();
  const defaultPrompt = /^You are a helpful receptionist for .+\.$/.test(prompt);
  return {
    website: setup.scanStatus === "ready",
    knowledge: setup.checklist.knowledge,
    name: Boolean(bot.name.trim()) && bot.name.trim() !== "New chatbot",
    phone: Boolean((bot.phone || "").trim()),
    booking: Boolean((bot.bookingUrl || "").trim()),
    greetings: greetings.length >= 1,
    treatments: options.length > 0,
    prompt: Boolean(prompt) && !defaultPrompt,
  };
}

export function checklistScore(list: SetupChecklist) {
  const values = Object.values(list);
  const done = values.filter(Boolean).length;
  return { done, total: values.length, percent: Math.round((done / values.length) * 100) };
}

export function parseSetupStep(value: string): SetupStep {
  if (value === "knowledge" || value === "interview" || value === "booking" || value === "live") {
    return value;
  }
  return "website";
}

export function applyExtractToBot(bot: Chatbot, extract: SetupExtract) {
  if (extract.name.trim()) bot.name = extract.name.trim();
  if (extract.phone.trim()) bot.phone = extract.phone.trim();
  if (extract.bookingUrl.trim()) bot.bookingUrl = extract.bookingUrl.trim();
  if (extract.avatarName.trim()) bot.avatarName = extract.avatarName.trim();
  const greetings = (extract.greetings || []).map((g) => g.trim()).filter(Boolean);
  if (greetings.length) {
    bot.greetings = greetings;
    bot.greeting = greetings[0];
  }
  if (extract.systemPrompt.trim()) bot.systemPrompt = extract.systemPrompt.trim();
}

export function faqsFromDrafts(chatbotId: string, drafts: SetupFaqDraft[]): KnowledgeItem[] {
  return drafts
    .map((d) => ({
      id: crypto.randomUUID(),
      chatbotId,
      title: d.title.trim() || "FAQ",
      question: d.question.trim(),
      answer: d.answer.trim(),
    }))
    .filter((d) => d.question && d.answer);
}

export function treatmentsFromDrafts(chatbotId: string, drafts: SetupTreatmentDraft[]): ChatbotOption[] {
  return drafts
    .map((d, i) => ({
      id: crypto.randomUUID(),
      chatbotId,
      label: d.label.trim(),
      starterMessage: (d.starterMessage || d.label).trim(),
      sortOrder: i,
      actionType: parseActionType(d.actionType),
      url: (d.url || "").trim(),
    }))
    .filter((d) => d.label);
}
