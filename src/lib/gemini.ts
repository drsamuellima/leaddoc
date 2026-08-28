import type { KnowledgeItem } from "./types";
import { allowDemoFallbacks } from "./config";
import { geminiApiKey, hasGemini } from "./integrations";

function faqContext(items: KnowledgeItem[], query: string): string {
  const q = query.toLowerCase();
  const scored = items
    .map((item) => {
      const hay = `${item.title} ${item.question} ${item.answer}`.toLowerCase();
      const hits = q.split(/\s+/).filter((w) => w.length > 2 && hay.includes(w)).length;
      return { item, hits };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 4);
  if (!scored.length) return "";
  return scored
    .map(({ item }) => `Q: ${item.question}\nA: ${item.answer}`)
    .join("\n\n");
}

export function parseModelJson(raw: string): Record<string, unknown> {
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function geminiModel() {
  return (process.env.GEMINI_MODEL || "gemini-3.6-flash").trim();
}

const MODEL_FALLBACKS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];

function geminiModelList() {
  const preferred = geminiModel();
  return [...new Set([preferred, ...MODEL_FALLBACKS])];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(status: number, message: string) {
  return (
    status === 429 ||
    /quota exceeded|rate.?limit|resource.?exhausted|free_tier|please retry/i.test(message)
  );
}

function retryDelayMs(res: Response, message: string) {
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.ceil(seconds * 1000), 45_000);
  }
  const match = message.match(/retry in ([\d.]+)\s*s/i);
  if (match) return Math.min(Math.ceil(Number(match[1]) * 1000), 45_000);
  return 8_000;
}

function friendlyGeminiError(message: string) {
  if (isRateLimited(429, message)) {
    const match = message.match(/retry in ([\d.]+)\s*s/i);
    const seconds = match ? Math.ceil(Number(match[1])) : 30;
    return `Gemini hit its free-tier request cap. Wait about ${seconds} seconds, then try again. A billed Gemini key raises this limit.`;
  }
  return message;
}

function toGeminiPayload(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .filter(Boolean)
    .join("\n\n");
  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    const role = message.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last?.role === role) {
      last.parts[0].text += `\n${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }
  if (contents[0]?.role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "(continue)" }] });
  }
  if (!contents.length) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }
  return { system, contents };
}

export async function completeChat(opts: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const key = geminiApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local and restart npm run dev.");
  }

  const { system, contents } = toGeminiPayload(opts.messages);
  const body = JSON.stringify({
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  });

  let lastError = "Gemini request failed";
  for (const model of geminiModelList()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body,
        },
      );
      const json = await res.json().catch(() => null);
      const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
      if (text) return text;
      const blocked = json?.promptFeedback?.blockReason;
      lastError = json?.error?.message || blocked || `Gemini request failed (${res.status})`;
      if (isRateLimited(res.status, lastError) && attempt === 0) {
        await sleep(retryDelayMs(res, lastError));
        continue;
      }
      const retryNext =
        res.status === 404 ||
        res.status === 429 ||
        res.status === 503 ||
        /not found|no longer available|not supported|high demand|try again later|quota exceeded|rate.?limit/i.test(
          lastError,
        );
      if (!retryNext) throw new Error(friendlyGeminiError(lastError));
      break;
    }
  }
  throw new Error(friendlyGeminiError(lastError));
}

export async function replyAsClinic(opts: {
  systemPrompt: string;
  knowledge: KnowledgeItem[];
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}): Promise<string> {
  const faqs = faqContext(opts.knowledge, opts.userMessage);
  const system = [
    opts.systemPrompt,
    "Keep replies concise. You are not a dentist making diagnoses.",
    faqs ? `Clinic FAQs:\n${faqs}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!hasGemini()) {
    if (!allowDemoFallbacks()) {
      throw new Error("Gemini is not configured");
    }
    const match = opts.knowledge.find((k) =>
      opts.userMessage.toLowerCase().includes(k.question.toLowerCase().slice(0, 12)),
    );
    if (match) return match.answer;
    return `Thanks for your message. A member of the practice team will follow up shortly. ${faqs ? "In the meantime: " + opts.knowledge[0]?.answer : ""}`.trim();
  }

  return completeChat({
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      ...opts.history.slice(-12),
      { role: "user", content: opts.userMessage },
    ],
  });
}
