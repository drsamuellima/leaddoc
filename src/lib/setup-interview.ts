import { hasOpenAI } from "./integrations";
import { deriveChecklist, faqsFromDrafts, treatmentsFromDrafts } from "./chatbot-setup";
import type { Chatbot, KnowledgeItem, SetupChecklist, SetupExtract, StoreData } from "./types";
import { parseActionType } from "./types";

const TOPICS: { key: keyof SetupChecklist; ask: string }[] = [
  { key: "name", ask: "What is the practice called? (the name patients will see)" },
  { key: "greetings", ask: "What should the receptionist be called in the chat, and how should the first welcome line read?" },
  { key: "prompt", ask: "Are you NHS, private, or mixed — and what are your usual opening hours?" },
  { key: "treatments", ask: "Which treatments should appear as buttons? List a few (for example Invisalign, whitening, emergency)." },
  { key: "phone", ask: "What is the main practice phone number patients should call?" },
  { key: "booking", ask: "Paste your online booking link (Dentally or any booking page)." },
];

export function nextInterviewQuestion(checklist: SetupChecklist) {
  const topic = TOPICS.find((t) => !checklist[t.key]);
  if (!topic) {
    return "That covers the essentials. You can still add a booking link or phone on the next card, then go live.";
  }
  return topic.ask;
}

function firstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0]?.replace(/[.,;]+$/, "") || "";
}

function firstPhone(text: string) {
  const match = text.match(/(?:\+44\s?|0)(?:\d[\s-]?){9,10}\d/);
  return match?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function replaceTreatments(data: StoreData, chatbotId: string, labels: { label: string; actionType: string; starterMessage?: string; url?: string }[]) {
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

async function modelPatch(opts: {
  checklist: SetupChecklist;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}): Promise<{ assistant: string; extract: Partial<SetupExtract> } | null> {
  if (!hasOpenAI()) return null;
  const missing = TOPICS.filter((t) => !opts.checklist[t.key]).map((t) => t.key);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You help a UK dental practice finish setting up a website chat. Ask one short question at a time. Only ask about missing fields: ${missing.join(", ") || "none"}. After the user replies, extract any facts. Return JSON: {"assistant":"next message","name":"","phone":"","bookingUrl":"","avatarName":"","greetings":[],"systemPrompt":"","faqs":[{"title":"","question":"","answer":""}],"treatments":[{"label":"","actionType":"lead","starterMessage":"","url":""}]}. Use empty values when unknown. Keep assistant friendly and brief. If nothing is missing, congratulate them and point them to the Booking card.`,
        },
        ...opts.history.slice(-10),
        { role: "user", content: opts.userMessage || "(start the interview)" },
      ],
    }),
  });
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Record<string, unknown>;
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

export async function runInterviewTurn(opts: {
  data: StoreData;
  bot: Chatbot;
  checklist: SetupChecklist;
  userMessage: string;
  start: boolean;
}) {
  const setup = opts.bot.setup;
  if (opts.start && setup.interview.length === 0) {
    let opening = nextInterviewQuestion(opts.checklist);
    try {
      const modeled = await modelPatch({
        checklist: opts.checklist,
        history: [],
        userMessage: "(start the interview)",
      });
      if (modeled?.assistant) opening = modeled.assistant;
    } catch {
      /* scripted */
    }
    setup.interview.push({ role: "assistant", content: opening });
    return opening;
  }

  const userMessage = opts.userMessage.trim();
  if (!userMessage) return nextInterviewQuestion(opts.checklist);

  setup.interview.push({ role: "user", content: userMessage });
  applyHeuristicReply({
    data: opts.data,
    bot: opts.bot,
    checklist: opts.checklist,
    reply: userMessage,
  });

  const options = opts.data.chatbotOptions.filter((o) => o.chatbotId === opts.bot.id);
  const faqs = opts.data.knowledgeItems.filter((k) => k.chatbotId === opts.bot.id);
  const nextCheck = deriveChecklist(opts.bot, options, faqs);

  let assistant = nextInterviewQuestion(nextCheck);
  try {
    const modeled = await modelPatch({
      checklist: nextCheck,
      history: setup.interview,
      userMessage,
    });
    if (modeled) {
      applyExtractPatch(opts.data, opts.bot, modeled.extract);
      assistant = modeled.assistant;
    }
  } catch {
    /* keep heuristic */
  }

  setup.interview.push({ role: "assistant", content: assistant });
  return assistant;
}
