import { allKnowledgeExamples } from "./knowledge-examples";
import { hasOpenAI } from "./integrations";
import { emptyExtract } from "./chatbot-setup";
import type { SetupExtract, SetupFaqDraft, SetupTreatmentDraft } from "./types";
import { parseActionType } from "./types";

const FETCH_MS = 8000;
const MAX_BYTES = 400_000;
const MAX_EXTRA_PAGES = 6;
const MAX_TEXT = 12_000;
const KEY_RE = /about|contact|treatment|service|hour|price|team|book|location|faq|staff|dentist|visit|new.?patient/i;

function isPrivateIPv4(hostname: string) {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true;
  if (a === 10 || a === 127 || a === 0 || a === 255) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  return isPrivateIPv4(host);
}

export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a full website address, starting with https://");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https websites can be scanned");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("That address cannot be scanned");
  }
  return url;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

async function fetchPage(url: string, redirects = 0): Promise<{ url: string; html: string } | null> {
  if (redirects > 3) return null;
  const target = assertPublicHttpUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(target.toString(), {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "LeadDocSetupBot/1.0 (+https://leaddoc.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      const next = new URL(loc, target);
      assertPublicHttpUrl(next.toString());
      return fetchPage(next.toString(), redirects + 1);
    }
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return { url: target.toString(), html: buf.subarray(0, MAX_BYTES).toString("utf8") };
    return { url: target.toString(), html: buf.toString("utf8") };
  } finally {
    clearTimeout(timer);
  }
}

function collectLinks(home: URL, html: string) {
  const found = new Map<string, string>();
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const href = new URL(match[1], home);
      if (href.host !== home.host) continue;
      if (href.protocol !== "http:" && href.protocol !== "https:") continue;
      const label = stripHtml(match[2]);
      const hay = `${href.pathname} ${label}`.toLowerCase();
      if (!KEY_RE.test(hay)) continue;
      const key = href.origin + href.pathname.replace(/\/$/, "");
      if (!found.has(key)) found.set(key, href.toString());
    } catch {
      /* skip */
    }
  }
  return [...found.values()].slice(0, MAX_EXTRA_PAGES);
}

function catalogFaqs(): SetupFaqDraft[] {
  return allKnowledgeExamples().map((item) => ({
    title: item.title,
    question: item.question,
    answer: item.answer,
  }));
}

function pickPhone(html: string, text: string) {
  const tel = html.match(/href=["']tel:([^"']+)["']/i);
  if (tel?.[1]) return decodeURIComponent(tel[1]).replace(/^\/\//, "").trim();
  const uk = text.match(/(?:\+44\s?|0)(?:\d[\s-]?){9,10}\d/);
  return uk?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function pickBooking(home: URL, html: string) {
  const re = /<a\s[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const href = new URL(match[1], home).toString();
      if (/dentally|booking|book-now|booknow|appoint/i.test(href)) return href;
    } catch {
      /* skip */
    }
  }
  return "";
}

function pickName(html: string) {
  const og = html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (og?.[1]) return og[1].trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title?.[1] ? stripHtml(title[1]).split("|")[0].split("-")[0].trim() : "";
}

function heuristicTreatments(text: string): SetupTreatmentDraft[] {
  const labels = ["Invisalign", "Teeth whitening", "Implants", "Hygiene", "Emergency", "Check-up"];
  return labels
    .filter((label) => text.toLowerCase().includes(label.toLowerCase().split(" ")[0].toLowerCase()))
    .slice(0, 6)
    .map((label) => ({
      label,
      actionType: label === "Emergency" ? parseActionType("call") : parseActionType("lead"),
      starterMessage: `I'd like to ask about ${label.toLowerCase()}.`,
      url: "",
    }));
}

function heuristicExtract(home: URL, pages: { url: string; html: string }[]): SetupExtract {
  const html = pages.map((p) => p.html).join("\n");
  const text = pages.map((p) => stripHtml(p.html)).join("\n");
  const name = pickName(pages[0]?.html || "");
  const phone = pickPhone(html, text);
  const bookingUrl = pickBooking(home, html);
  const hoursHit = /monday|opening hours|we are open/i.test(text);
  const faqs = catalogFaqs();
  if (hoursHit) {
    const hours = text.match(/.{0,40}(monday|opening hours).{0,80}/i);
    if (hours?.[0]) {
      const idx = faqs.findIndex((f) => /hours/i.test(f.title));
      if (idx >= 0) faqs[idx] = { ...faqs[idx], answer: hours[0].replace(/\s+/g, " ").trim() };
    }
  }
  return {
    name,
    phone,
    bookingUrl,
    avatarName: "",
    greetings: name ? [`Welcome to ${name}. How can we help?`] : [],
    systemPrompt: name
      ? `You are a helpful receptionist for ${name}, a UK dental practice. Answer from the approved FAQs. Never diagnose. Offer to book or take a callback.`
      : "",
    faqs,
    treatments: heuristicTreatments(text),
    pages: pages.map((p) => p.url),
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asFaqs(value: unknown): SetupFaqDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      title: asString((row as { title?: unknown }).title) || "FAQ",
      question: asString((row as { question?: unknown }).question),
      answer: asString((row as { answer?: unknown }).answer),
    }))
    .filter((row) => row.question && row.answer)
    .slice(0, 24);
}

function asTreatments(value: unknown): SetupTreatmentDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      label: asString((row as { label?: unknown }).label),
      actionType: parseActionType(asString((row as { actionType?: unknown }).actionType) || "lead"),
      starterMessage: asString((row as { starterMessage?: unknown }).starterMessage),
      url: asString((row as { url?: unknown }).url),
    }))
    .filter((row) => row.label)
    .slice(0, 10)
    .map((row) => ({ ...row, starterMessage: row.starterMessage || `I'd like to ask about ${row.label}.` }));
}

function mergeExtract(base: SetupExtract, overlay: Partial<SetupExtract>): SetupExtract {
  return {
    name: overlay.name?.trim() || base.name,
    phone: overlay.phone?.trim() || base.phone,
    bookingUrl: overlay.bookingUrl?.trim() || base.bookingUrl,
    avatarName: overlay.avatarName?.trim() || base.avatarName,
    greetings: overlay.greetings?.length ? overlay.greetings.map((g) => g.trim()).filter(Boolean) : base.greetings,
    systemPrompt: overlay.systemPrompt?.trim() || base.systemPrompt,
    faqs: overlay.faqs?.length ? overlay.faqs : base.faqs,
    treatments: overlay.treatments?.length ? overlay.treatments : base.treatments,
    pages: overlay.pages?.length ? overlay.pages : base.pages,
  };
}

async function aiExtract(combined: string, pages: string[]): Promise<Partial<SetupExtract> | null> {
  if (!hasOpenAI()) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Extract dental practice facts from website text. Return JSON only with keys: name, phone, bookingUrl, avatarName, greetings (string array, 1-3 lines), systemPrompt, faqs (array of {title, question, answer}), treatments (array of {label, actionType: lead|book|call, starterMessage, url}). Use UK English. Do not invent prices or clinical claims. If unknown, use empty string or [].",
        },
        {
          role: "user",
          content: `Pages:\n${pages.join("\n")}\n\nText:\n${combined.slice(0, 28000)}`,
        },
      ],
    }),
  });
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: asString(parsed.name),
      phone: asString(parsed.phone),
      bookingUrl: asString(parsed.bookingUrl),
      avatarName: asString(parsed.avatarName),
      greetings: Array.isArray(parsed.greetings) ? parsed.greetings.map(asString).filter(Boolean) : [],
      systemPrompt: asString(parsed.systemPrompt),
      faqs: asFaqs(parsed.faqs),
      treatments: asTreatments(parsed.treatments),
      pages,
    };
  } catch {
    return null;
  }
}

export async function scanPracticeSite(rawUrl: string): Promise<SetupExtract> {
  const home = assertPublicHttpUrl(rawUrl);
  const homePage = await fetchPage(home.toString());
  if (!homePage) {
    throw new Error("We could not load that website. Check the address and try again.");
  }
  const extras = collectLinks(new URL(homePage.url), homePage.html);
  const extraPages = (
    await Promise.all(
      extras.map(async (url) => {
        try {
          return await fetchPage(url);
        } catch {
          return null;
        }
      }),
    )
  ).filter((p): p is { url: string; html: string } => Boolean(p));
  const pages = [homePage, ...extraPages];
  const base = heuristicExtract(new URL(homePage.url), pages);
  const combined = pages.map((p) => `URL: ${p.url}\n${stripHtml(p.html)}`).join("\n\n");
  try {
    const ai = await aiExtract(combined, pages.map((p) => p.url));
    if (ai) return mergeExtract(base, ai);
  } catch {
    /* keep heuristic */
  }
  if (!base.faqs.length) base.faqs = catalogFaqs();
  return { ...emptyExtract(), ...base, pages: pages.map((p) => p.url) };
}
