import type { KnowledgeItem } from "./types";
import { hasOpenAI } from "./integrations";

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

  if (!hasOpenAI()) {
    const match = opts.knowledge.find((k) =>
      opts.userMessage.toLowerCase().includes(k.question.toLowerCase().slice(0, 12)),
    );
    if (match) return match.answer;
    return `Thanks for your message. A member of the practice team will follow up shortly. ${faqs ? "In the meantime: " + opts.knowledge[0]?.answer : ""}`.trim();
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...opts.history.slice(-12),
        { role: "user", content: opts.userMessage },
      ],
      temperature: 0.4,
    }),
  });
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error(json.error?.message || "OpenAI did not return a reply");
  return text as string;
}
