import { hasGemini } from "./integrations";
import { completeChat, parseModelJson } from "./gemini";
import { deriveChecklist, faqsFromDrafts, treatmentsFromDrafts } from "./chatbot-setup";
import type {
  Chatbot,
  ChatbotOption,
  KnowledgeItem,
  SetupChecklist,
  SetupConfirmField,
  SetupExtract,
  SetupInterviewMessage,
  StoreData,
} from "./types";
import { parseActionType } from "./types";

const INTERVIEW_TOPICS: { key: keyof SetupChecklist; ask: string }[] = [
  { key: "greetings", ask: "What should the receptionist be called, and how should the first welcome line read?" },
  { key: "prompt", ask: "Are you NHS, private, or mixed — and what are your usual opening hours?" },
  { key: "treatments", ask: "Which treatments should appear as buttons? List a few (for example Invisalign, whitening, emergency)." },
  { key: "name", ask: "What is the practice called? (the name patients will see)" },
];

const CONFIRM_COPY: Record<SetupConfirmField, { prompt: string; correction: string }> = {
  name: {
    prompt: "Quick check — this is the name patients will see. Green tick if it is spot on.",
    correction: "No problem. What should the practice be called?",
  },
  phone: {
    prompt: "This is the number Call buttons will dial. Tick if it is the front desk.",
    correction: "Got it. What number should patients call?",
  },
  booking: {
    prompt: "Booking buttons will open this link. Green tick if that is the real book-now page.",
    correction: "Fair. Paste the online booking link we should use.",
  },
  treatments: {
    prompt: "These become the treatment buttons on the widget. All looking right?",
    correction: "Tell me the service names that should be buttons, separated by commas.",
  },
};

type ConfirmFact = { field: SetupConfirmField; value: string };

export function nextInterviewQuestion(checklist: SetupChecklist) {
  const topic = INTERVIEW_TOPICS.find((t) => !checklist[t.key]);
  if (!topic) {
    return "All set! Opening Booking next so you can check the phone and link, then go live.";
  }
  return topic.ask;
}

export function isInterviewWrapUp(text: string) {
  return /\b(all set|you are set|opening booking|head over to booking|hit go live|practice assistant is ready)\b/i.test(
    text,
  );
}

export function shouldAdvanceToBooking(bot: Chatbot, options: ChatbotOption[], faqs: KnowledgeItem[]) {
  const setup = bot.setup;
  if (setup.awaitingField) return false;
  if (nextFactToConfirm(bot, options)) return false;
  const last = setup.interview[setup.interview.length - 1];
  if (last?.confirm?.status === "pending") return false;
  const checklist = deriveChecklist(bot, options, faqs);
  const stillAsking = INTERVIEW_TOPICS.some((t) => !checklist[t.key]);
  if (!stillAsking) return true;
  return last?.role === "assistant" && isInterviewWrapUp(last.content);
}

function firstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0]?.replace(/[.,;]+$/, "") || "";
}

function firstPhone(text: string) {
  const match = text.match(/(?:\+44\s?|0)(?:\d[\s-]?){9,10}\d/);
  return match?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function knownFacts(bot: Chatbot, options: ChatbotOption[]) {
  const name = bot.name.trim() !== "New chatbot" ? bot.name.trim() : "";
  return {
    name,
    phone: (bot.phone || "").trim(),
    booking: (bot.bookingUrl || "").trim(),
    treatments: options.map((o) => o.label).filter(Boolean),
  };
}

export function nextFactToConfirm(bot: Chatbot, options: ChatbotOption[]): ConfirmFact | null {
  const setup = bot.setup;
  const confirmed = setup.confirmed || {};
  const known = knownFacts(bot, options);
  if (known.name && !confirmed.name) return { field: "name", value: known.name };
  if (known.phone && !confirmed.phone) return { field: "phone", value: known.phone };
  if (known.booking && !confirmed.booking) return { field: "booking", value: known.booking };
  if (known.treatments.length && !confirmed.treatments) return { field: "treatments", value: known.treatments.join(", ") };
  return null;
}

function pushConfirm(setup: Chatbot["setup"], fact: ConfirmFact) {
  const msg: SetupInterviewMessage = {
    role: "assistant",
    content: CONFIRM_COPY[fact.field].prompt,
    confirm: { field: fact.field, value: fact.value, status: "pending" },
  };
  setup.interview.push(msg);
}

function lastPendingConfirm(setup: Chatbot["setup"]) {
  for (let i = setup.interview.length - 1; i >= 0; i -= 1) {
    const msg = setup.interview[i];
    if (msg.confirm?.status === "pending") return msg;
  }
  return null;
}

function replaceTreatments(
  data: StoreData,
  chatbotId: string,
  labels: { label: string; actionType: string; starterMessage?: string; url?: string }[],
) {
  const next = treatmentsFromDrafts(
    chatbotId,
    labels.map((row) => ({
      label: row.label,
      actionType: parseActionType(row.actionType),
      starterMessage: row.starterMessage || `I'd like to ask about ${row.label.toLowerCase()}.`,
      url: row.url || "",
    })),
  );
  if (!next.length) return;
  data.chatbotOptions = data.chatbotOptions.filter((o) => o.chatbotId !== chatbotId).concat(next);
}

function upsertFaq(data: StoreData, chatbotId: string, title: string, question: string, answer: string) {
  const existing = data.knowledgeItems.find(
    (f) =>
      f.chatbotId === chatbotId &&
      (f.question.toLowerCase() === question.toLowerCase() || f.title.toLowerCase() === title.toLowerCase()),
  );
  if (existing) {
    existing.answer = answer;
    existing.question = question;
    existing.title = title;
    return;
  }
  const item: KnowledgeItem = {
    id: crypto.randomUUID(),
    chatbotId,
    title,
    question,
    answer,
  };
  data.knowledgeItems.push(item);
}

function applyCorrection(opts: { data: StoreData; bot: Chatbot; field: SetupConfirmField; text: string }) {
  const { data, bot, field, text } = opts;
  const value = text.trim();
  if (field === "name") bot.name = value.split("\n")[0].slice(0, 80);
  if (field === "phone") bot.phone = firstPhone(value) || value.slice(0, 40);
  if (field === "booking") bot.bookingUrl = firstUrl(value) || value;
  if (field === "treatments") {
    const labels = value
      .split(/[,;\n]| and /i)
      .map((s) => s.replace(/^[-•\d.\s]+/, "").trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .slice(0, 8);
    if (labels.length) {
      replaceTreatments(
        data,
        bot.id,
        labels.map((label) => ({
          label,
          actionType: /emergenc|call/i.test(label) ? "call" : /book/i.test(label) ? "book" : "lead",
        })),
      );
    }
  }
}

function clearField(data: StoreData, bot: Chatbot, field: SetupConfirmField) {
  if (field === "name") bot.name = "New chatbot";
  if (field === "phone") bot.phone = "";
  if (field === "booking") bot.bookingUrl = "";
  if (field === "treatments") {
    data.chatbotOptions = data.chatbotOptions.filter((o) => o.chatbotId !== bot.id);
  }
}

export function applyHeuristicReply(opts: {
  data: StoreData;
  bot: Chatbot;
  checklist: SetupChecklist;
  reply: string;
}) {
  const { data, bot, checklist, reply } = opts;
  const text = reply.trim();
  if (!text) return;
  const url = firstUrl(text);
  const phone = firstPhone(text);

  if (!checklist.name) {
    bot.name = text.split("\n")[0].slice(0, 80);
  } else if (!checklist.greetings) {
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    bot.avatarName = lines[0].replace(/^i'?m\s+/i, "").slice(0, 40);
    bot.greetings = lines.length > 1 ? lines.slice(1, 4) : [`Hi, I’m ${bot.avatarName || "the receptionist"} at ${bot.name}. How can we help?`];
    bot.greeting = bot.greetings[0];
  } else if (!checklist.prompt) {
    bot.systemPrompt = `You are a helpful receptionist for ${bot.name}, a UK dental practice. ${text} Never diagnose. Offer to book or take a callback.`;
    if (/hour|monday|open/i.test(text)) {
      upsertFaq(data, bot.id, "Hours", "What are your opening hours?", text);
    }
    if (/nhs|private/i.test(text)) {
      upsertFaq(data, bot.id, "New patients", "Do you accept new NHS or private patients?", text);
    }
    if (/emergenc/i.test(text)) {
      upsertFaq(data, bot.id, "Emergencies", "I have dental pain — can I be seen today?", text);
    }
  } else if (!checklist.treatments) {
    const labels = text
      .split(/[,;\n]| and /i)
      .map((s) => s.replace(/^[-•\d.\s]+/, "").trim())
      .filter((s) => s.length > 1 && s.length < 40)
      .slice(0, 8);
    if (labels.length) {
      replaceTreatments(
        data,
        bot.id,
        labels.map((label) => ({
          label,
          actionType: /emergenc|call/i.test(label) ? "call" : /book/i.test(label) ? "book" : "lead",
        })),
      );
    }
  }

  if (phone) bot.phone = phone;
  if (url) bot.bookingUrl = url;
}

function historyForModel(interview: SetupInterviewMessage[]) {
  return interview.map((msg) => ({ role: msg.role, content: msg.content }));
}

async function modelPatch(opts: {
  bot: Chatbot;
  options: ChatbotOption[];
  checklist: SetupChecklist;
  history: SetupInterviewMessage[];
  userMessage: string;
}): Promise<{ assistant: string; extract: Partial<SetupExtract> } | null> {
  if (!hasGemini()) return null;
  const known = knownFacts(opts.bot, opts.options);
  const skip = new Set<string>();
  if (known.name) skip.add("name");
  if (known.phone) skip.add("phone");
  if (known.booking) skip.add("booking");
  if (known.treatments.length) skip.add("treatments");
  const missing = INTERVIEW_TOPICS.filter((t) => !opts.checklist[t.key] && !skip.has(t.key)).map((t) => t.key);
  const raw = await completeChat({
    json: true,
    temperature: 0.55,
    messages: [
      {
        role: "system",
        content: `You help a UK dental practice finish a website chat. Be warm, sharp, and a little playful — like a latest-gen product assistant — but stay brief. One question at a time. Never ask the user to retype facts already known. Do not ask for phone or booking URL here — the next card covers those. Known: name=${known.name || "(none)"}; phone=${known.phone || "(none)"}; booking=${known.booking || "(none)"}; services=${known.treatments.join(", ") || "(none)"}. Only ask about: ${missing.join(", ") || "none"}. After they reply, extract any new facts. Return JSON: {"assistant":"next message","name":"","phone":"","bookingUrl":"","avatarName":"","greetings":[],"systemPrompt":"","faqs":[{"title":"","question":"","answer":""}],"treatments":[{"label":"","actionType":"lead","starterMessage":"","url":""}]}. Empty strings when unknown. If nothing is missing, reply with one short celebration that includes the words "All set". The app will open Booking automatically. At most one emoji.`,
      },
      ...historyForModel(opts.history).slice(-10),
      { role: "user", content: opts.userMessage || "(continue)" },
    ],
  });
  const parsed = parseModelJson(raw);
  return {
    assistant: typeof parsed.assistant === "string" ? parsed.assistant : nextInterviewQuestion(opts.checklist),
    extract: {
      name: typeof parsed.name === "string" ? parsed.name : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      bookingUrl: typeof parsed.bookingUrl === "string" ? parsed.bookingUrl : "",
      avatarName: typeof parsed.avatarName === "string" ? parsed.avatarName : "",
      greetings: Array.isArray(parsed.greetings) ? parsed.greetings.filter((g): g is string => typeof g === "string") : [],
      systemPrompt: typeof parsed.systemPrompt === "string" ? parsed.systemPrompt : "",
      faqs: Array.isArray(parsed.faqs)
        ? parsed.faqs.map((row) => ({
            title: String((row as { title?: string }).title || "FAQ"),
            question: String((row as { question?: string }).question || ""),
            answer: String((row as { answer?: string }).answer || ""),
          }))
        : [],
      treatments: Array.isArray(parsed.treatments)
        ? parsed.treatments.map((row) => ({
            label: String((row as { label?: string }).label || ""),
            actionType: parseActionType(String((row as { actionType?: string }).actionType || "lead")),
            starterMessage: String((row as { starterMessage?: string }).starterMessage || ""),
            url: String((row as { url?: string }).url || ""),
          }))
        : [],
    },
  };
}

export function applyExtractPatch(data: StoreData, bot: Chatbot, extract: Partial<SetupExtract>) {
  if (extract.name?.trim()) bot.name = extract.name.trim();
  if (extract.phone?.trim()) bot.phone = extract.phone.trim();
  if (extract.bookingUrl?.trim()) bot.bookingUrl = extract.bookingUrl.trim();
  if (extract.avatarName?.trim()) bot.avatarName = extract.avatarName.trim();
  if (extract.greetings?.length) {
    bot.greetings = extract.greetings.map((g) => g.trim()).filter(Boolean);
    if (bot.greetings[0]) bot.greeting = bot.greetings[0];
  }
  if (extract.systemPrompt?.trim()) bot.systemPrompt = extract.systemPrompt.trim();
  if (extract.faqs?.length) {
    for (const item of faqsFromDrafts(bot.id, extract.faqs)) {
      upsertFaq(data, bot.id, item.title, item.question, item.answer);
    }
  }
  if (extract.treatments?.length) {
    replaceTreatments(data, bot.id, extract.treatments);
  }
}

async function askFollowUp(opts: { data: StoreData; bot: Chatbot; checklist: SetupChecklist; userMessage: string }) {
  const options = opts.data.chatbotOptions.filter((o) => o.chatbotId === opts.bot.id);
  let assistant = nextInterviewQuestion(opts.checklist);
  const modeled = await modelPatch({
    bot: opts.bot,
    options,
    checklist: opts.checklist,
    history: opts.bot.setup.interview,
    userMessage: opts.userMessage,
  });
  if (modeled) {
    applyExtractPatch(opts.data, opts.bot, modeled.extract);
    assistant = modeled.assistant;
  }
  opts.bot.setup.interview.push({ role: "assistant", content: assistant });
}

async function continueAfterGap(opts: { data: StoreData; bot: Chatbot }) {
  const options = opts.data.chatbotOptions.filter((o) => o.chatbotId === opts.bot.id);
  const fact = nextFactToConfirm(opts.bot, options);
  if (fact) {
    pushConfirm(opts.bot.setup, fact);
    return;
  }
  const faqs = opts.data.knowledgeItems.filter((k) => k.chatbotId === opts.bot.id);
  const checklist = deriveChecklist(opts.bot, options, faqs);
  await askFollowUp({
    data: opts.data,
    bot: opts.bot,
    checklist,
    userMessage: "(continue — known details are confirmed, ask only what is still missing)",
  });
}

export async function runInterviewTurn(opts: {
  data: StoreData;
  bot: Chatbot;
  checklist: SetupChecklist;
  userMessage: string;
  start: boolean;
  confirm?: { field: SetupConfirmField; accepted: boolean };
}) {
  const setup = opts.bot.setup;
  if (!setup.confirmed) setup.confirmed = {};
  const options = () => opts.data.chatbotOptions.filter((o) => o.chatbotId === opts.bot.id);

  if (opts.start && setup.interview.length > 0 && !opts.confirm) return;

  if (opts.confirm) {
    const pending = lastPendingConfirm(setup);
    if (!pending?.confirm || pending.confirm.field !== opts.confirm.field) return;
    if (opts.confirm.accepted) {
      pending.confirm.status = "accepted";
      setup.confirmed[opts.confirm.field] = true;
      setup.interview.push({ role: "user", content: "Yes, that's right" });
      await continueAfterGap({ data: opts.data, bot: opts.bot });
      return;
    }
    pending.confirm.status = "rejected";
    setup.confirmed[opts.confirm.field] = false;
    clearField(opts.data, opts.bot, opts.confirm.field);
    setup.awaitingField = opts.confirm.field;
    setup.interview.push({ role: "user", content: "That's not right" });
    setup.interview.push({ role: "assistant", content: CONFIRM_COPY[opts.confirm.field].correction });
    return;
  }

  if (opts.start && setup.interview.length === 0) {
    const fact = nextFactToConfirm(opts.bot, options());
    if (fact) {
      pushConfirm(setup, fact);
      return;
    }
    await askFollowUp({
      data: opts.data,
      bot: opts.bot,
      checklist: opts.checklist,
      userMessage: "(start the interview)",
    });
    return;
  }

  const userMessage = opts.userMessage.trim();
  if (!userMessage) {
    await continueAfterGap({ data: opts.data, bot: opts.bot });
    return;
  }

  setup.interview.push({ role: "user", content: userMessage });

  if (setup.awaitingField) {
    applyCorrection({ data: opts.data, bot: opts.bot, field: setup.awaitingField, text: userMessage });
    setup.confirmed[setup.awaitingField] = true;
    setup.awaitingField = undefined;
    await continueAfterGap({ data: opts.data, bot: opts.bot });
    return;
  }

  applyHeuristicReply({
    data: opts.data,
    bot: opts.bot,
    checklist: opts.checklist,
    reply: userMessage,
  });

  const faqs = opts.data.knowledgeItems.filter((k) => k.chatbotId === opts.bot.id);
  const nextCheck = deriveChecklist(opts.bot, options(), faqs);
  await askFollowUp({
    data: opts.data,
    bot: opts.bot,
    checklist: nextCheck,
    userMessage,
  });
}
