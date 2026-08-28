import { hasGemini } from "./integrations";
import { completeChat, parseModelJson } from "./gemini";
import { emptyExtract } from "./chatbot-setup";
import type { SetupExtract, SetupFaqDraft, SetupTreatmentDraft } from "./types";
import { parseActionType } from "./types";

const FETCH_MS = 8000;
const MAX_BYTES = 800_000;
const MAX_EXTRA_PAGES = 10;
const MAX_TEXT = 20_000;
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
  const keyword = new Map<string, string>();
  const other = new Map<string, string>();
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const href = new URL(match[1], home);
      if (href.host !== home.host) continue;
      if (href.protocol !== "http:" && href.protocol !== "https:") continue;
      if (/\.(pdf|jpe?g|png|gif|webp|svg|css|js|zip)(\?|$)/i.test(href.pathname)) continue;
      if (/wp-admin|wp-login|cart|checkout|account\/login/i.test(href.pathname)) continue;
      const homeKey = home.origin + home.pathname.replace(/\/$/, "");
      const key = href.origin + href.pathname.replace(/\/$/, "");
      if (key === homeKey) continue;
      const label = stripHtml(match[2]);
      const hay = `${href.pathname} ${label}`.toLowerCase();
      if (KEY_RE.test(hay)) {
        if (!keyword.has(key)) keyword.set(key, href.toString());
      } else if (!other.has(key) && !href.pathname.startsWith("/cdn")) {
        other.set(key, href.toString());
      }
    } catch {
      /* skip */
    }
  }
  return [...keyword.values(), ...other.values()].slice(0, MAX_EXTRA_PAGES);
}

function siteFaqsFromText(name: string, phone: string, bookingUrl: string, text: string): SetupFaqDraft[] {
  const faqs: SetupFaqDraft[] = [];
  const hours = text.match(/(opening hours|we are open)[^.]{0,80}\d[^.]{0,40}/i);
  if (hours?.[0]) {
    faqs.push({
      title: "Hours",
      question: "What are your opening hours?",
      answer: hours[0].replace(/\s+/g, " ").trim(),
      source: "site",
    });
  }
  if (phone) {
    faqs.push({
      title: "Phone",
      question: "What is the practice phone number?",
      answer: `You can call us on ${phone}.`,
      source: "site",
    });
  }
  if (bookingUrl) {
    faqs.push({
      title: "Booking",
      question: "How do I book an appointment?",
      answer: `Book online at ${bookingUrl} or call the practice.`,
      source: "site",
    });
  }
  const about = text.slice(0, 400).replace(/\s+/g, " ").trim();
  if (name && about.length > 40) {
    faqs.push({
      title: "About",
      question: `Tell me about ${name}`,
      answer: about,
      source: "site",
    });
  }
  return faqs;
}

function pickPhone(html: string, text: string) {
  const tel = html.match(/href=["']tel:([^"']+)["']/i);
  if (tel?.[1]) return decodeURIComponent(tel[1]).replace(/^\/\//, "").trim();
  const uk = text.match(/(?:\+44\s?|0)(?:\d[\s-]?){9,10}\d/);
  return uk?.[0]?.replace(/\s+/g, " ").trim() || "";
}

function looksLikeBookingUrl(href: string) {
  return /dentally|book-now|booknow|booking\.|\/book(?:ing)?(?:\/|$)|appoint/i.test(href);
}

function pickBooking(home: URL, html: string) {
  const re = /<a\s[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const href = new URL(match[1], home).toString();
      if (looksLikeBookingUrl(href) && !isPracticeHomepage(home, href)) return href;
    } catch {
      /* skip */
    }
  }
  return "";
}

function pickName(html: string) {
  const og = html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (og?.[1]) return cleanPracticeName(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title?.[1] ? cleanPracticeName(stripHtml(title[1]).split("|")[0].split("-")[0]) : "";
}

function isPracticeHomepage(home: URL, raw: string) {
  try {
    const url = new URL(raw);
    if (url.host !== home.host) return false;
    const path = url.pathname.replace(/\/$/, "") || "/";
    const homePath = home.pathname.replace(/\/$/, "") || "/";
    return path === "/" || path === homePath;
  } catch {
    return false;
  }
}

function cleanPracticeName(value: string) {
  const name = value.replace(/\s+/g, " ").trim();
  if (!name) return "";
  if (/^(home|welcome|index|untitled|website)$/i.test(name)) return "";
  if (/^https?:\/\//i.test(name)) return "";
  return name.slice(0, 80);
}

function cleanPhone(value: string) {
  const phone = value.replace(/\s+/g, " ").trim();
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return phone.slice(0, 40);
}

function cleanBookingUrl(home: URL, value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, home);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const href = url.toString();
    if (isPracticeHomepage(home, href) && !looksLikeBookingUrl(href)) return "";
    return href;
  } catch {
    return "";
  }
}

function contactFromSite(home: URL, name: string, phone: string, bookingUrl: string) {
  return {
    name: cleanPracticeName(name),
    phone: cleanPhone(phone),
    bookingUrl: cleanBookingUrl(home, bookingUrl),
  };
}

const SKIP_SERVICE = /^(home|contact|about|book now|book online|login|read more|learn more|click here|view all|see all|more|menu|privacy|cookies|facebook|instagram|twitter|linkedin)$/i;

function slugToLabel(pathname: string) {
  const last = pathname.split("/").filter(Boolean).pop() || "";
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function addServiceLabel(labels: string[], seen: Set<string>, raw: string) {
  const label = stripHtml(raw).replace(/\s+/g, " ").trim();
  if (label.length < 3 || label.length > 50) return;
  if (SKIP_SERVICE.test(label)) return;
  const key = label.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  labels.push(label);
}

function toTreatmentDrafts(labels: string[]): SetupTreatmentDraft[] {
  return labels.slice(0, 16).map((label) => ({
    label,
    actionType: /emergency/i.test(label) ? parseActionType("call") : parseActionType("lead"),
    starterMessage: `I'd like to ask about ${label}.`,
    url: "",
  }));
}

function heuristicTreatments(pages: { url: string; html: string }[]): SetupTreatmentDraft[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const page of pages) {
    let pageUrl: URL;
    try {
      pageUrl = new URL(page.url);
    } catch {
      continue;
    }
    const onServicePage = /treatment|service|what-we-do/i.test(pageUrl.pathname);
    const linkRe = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = linkRe.exec(page.html))) {
      try {
        const href = new URL(match[1], pageUrl);
        if (href.host !== pageUrl.host) continue;
        if (!/treatment|service/i.test(href.pathname)) continue;
        const here = pageUrl.pathname.replace(/\/$/, "");
        const there = href.pathname.replace(/\/$/, "");
        if (there === here) continue;
        const text = stripHtml(match[2]);
        addServiceLabel(labels, seen, text.length >= 3 && !SKIP_SERVICE.test(text) ? text : slugToLabel(href.pathname));
      } catch {
        /* skip */
      }
    }
    if (onServicePage) {
      const headingRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
      let heading: RegExpExecArray | null;
      while ((heading = headingRe.exec(page.html))) {
        addServiceLabel(labels, seen, heading[1]);
      }
    }
  }
  return toTreatmentDrafts(labels);
}

function heuristicExtract(home: URL, pages: { url: string; html: string }[]): SetupExtract {
  const html = pages.map((p) => p.html).join("\n");
  const text = pages.map((p) => stripHtml(p.html)).join("\n");
  const contact = contactFromSite(home, pickName(pages[0]?.html || ""), pickPhone(html, text), pickBooking(home, html));
  const { name, phone, bookingUrl } = contact;
  const hoursHit = /monday|opening hours|we are open/i.test(text);
  const faqs = siteFaqsFromText(name, phone, bookingUrl, text);
  if (hoursHit && !faqs.some((f) => /hours/i.test(f.title))) {
    const hours = text.match(/.{0,40}(monday|opening hours).{0,80}/i);
    if (hours?.[0]) {
      faqs.unshift({
        title: "Hours",
        question: "What are your opening hours?",
        answer: hours[0].replace(/\s+/g, " ").trim(),
        source: "site",
      });
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
    treatments: heuristicTreatments(pages),
    pages: pages.map((p) => p.url),
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asFaqs(value: unknown): SetupFaqDraft[] {
  let rows: unknown[] = [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asFaqs(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) rows = value;
  else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const nested = obj.items || obj.faqs || obj.list;
    if (Array.isArray(nested)) rows = nested;
    else rows = Object.values(obj).filter((item) => item && typeof item === "object");
  }
  return rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        title: asString(item.title || item.topic || item.name) || "FAQ",
        question: asString(item.question || item.Question || item.q || item.prompt),
        answer: asString(item.answer || item.Answer || item.a || item.response || item.text),
        source: asString(item.source).toLowerCase() === "suggested" ? ("suggested" as const) : ("site" as const),
      };
    })
    .filter((row) => row.question && row.answer)
    .slice(0, 40);
}

function pickFaqList(parsed: Record<string, unknown>): unknown {
  for (const key of ["faqs", "FAQs", "faq", "knowledge", "knowledgeItems", "items", "suggestedFaqs"]) {
    const value = parsed[key];
    if (Array.isArray(value) && value.length) return value;
    if (typeof value === "string" && value.includes("[")) return value;
  }
  for (const value of Object.values(parsed)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = pickFaqList(value as Record<string, unknown>);
      if (nested) return nested;
    }
  }
  return parsed.faqs;
}

function pickTreatmentList(parsed: Record<string, unknown>): unknown {
  for (const key of ["treatments", "services", "treatmentList", "serviceList", "procedures"]) {
    const value = parsed[key];
    if (Array.isArray(value) && value.length) return value;
    if (typeof value === "string" && value.trim()) return value;
  }
  return parsed.treatments;
}

function asTreatments(value: unknown): SetupTreatmentDraft[] {
  let rows: unknown[] = [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return asTreatments(JSON.parse(trimmed));
      } catch {
        /* split below */
      }
    }
    rows = trimmed.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean);
  } else if (Array.isArray(value)) rows = value;
  else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const nested = obj.items || obj.treatments || obj.services || obj.list;
    if (Array.isArray(nested)) rows = nested;
  }
  return rows
    .map((row) => {
      if (typeof row === "string") {
        const label = row.trim();
        return {
          label,
          actionType: parseActionType(/emergency/i.test(label) ? "call" : "lead"),
          starterMessage: label ? `I'd like to ask about ${label}.` : "",
          url: "",
        };
      }
      const item = row as Record<string, unknown>;
      const label = asString(item.label || item.name || item.title || item.service || item.treatment);
      return {
        label,
        actionType: parseActionType(asString(item.actionType) || (/emergency/i.test(label) ? "call" : "lead")),
        starterMessage: asString(item.starterMessage) || (label ? `I'd like to ask about ${label}.` : ""),
        url: asString(item.url),
      };
    })
    .filter((row) => row.label)
    .slice(0, 16);
}

function mergeExtract(home: URL, base: SetupExtract, overlay: Partial<SetupExtract>): SetupExtract {
  const aiContact = contactFromSite(home, overlay.name || "", overlay.phone || "", overlay.bookingUrl || "");
  return {
    name: aiContact.name,
    phone: aiContact.phone,
    bookingUrl: aiContact.bookingUrl,
    avatarName: overlay.avatarName?.trim() || base.avatarName,
    greetings: overlay.greetings?.length ? overlay.greetings.map((g) => g.trim()).filter(Boolean) : base.greetings,
    systemPrompt: overlay.systemPrompt?.trim() || base.systemPrompt,
    faqs: overlay.faqs?.length ? overlay.faqs : base.faqs,
    treatments: overlay.treatments?.length ? overlay.treatments : base.treatments,
    pages: overlay.pages?.length ? overlay.pages : base.pages,
  };
}

async function aiExtract(combined: string, pages: string[]): Promise<Partial<SetupExtract>> {
  const raw = await completeChat({
    json: true,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          'Extract a dental chatbot knowledge base from the website text. Return JSON only with keys: name, phone, bookingUrl, avatarName, greetings (1-3 lines), systemPrompt, faqs (array of {title, question, answer, source}), treatments (array of {label, actionType: lead|book|call, starterMessage, url}). name, phone, and bookingUrl must be copied from the pages or be empty strings — never guess, never invent, never use the homepage as bookingUrl unless that URL is clearly an online booking page (Dentally, book, appointment). Phone only if a practice number is written or in a tel: link. treatments must be every named service the practice lists (use the site’s own names: hygiene, implants, Invisalign, composite bonding, and so on). Do not invent services the pages do not mention. actionType is lead unless the service is clearly book-online or emergency call. source must be "site" when the answer is stated on the pages, or "suggested" for extra FAQs you recommend that the site did not cover (max 6 suggested). Pull as many site FAQs as the text supports: treatments, hours, location, parking, fees, NHS/private, team, emergencies, new patients. Paraphrase the site; do not invent clinic-specific facts. Do not use generic dental template answers unless source is suggested.',
      },
      {
        role: "user",
          content: `Pages:\n${pages.join("\n")}\n\nText:\n${combined.slice(0, 35000)}`,
      },
    ],
  });
  const parsed = parseModelJson(raw);
  const faqList = pickFaqList(parsed);
  const faqs = asFaqs(faqList);
  return {
    name: asString(parsed.name),
    phone: asString(parsed.phone),
    bookingUrl: asString(parsed.bookingUrl),
    avatarName: asString(parsed.avatarName),
    greetings: Array.isArray(parsed.greetings) ? parsed.greetings.map(asString).filter(Boolean) : [],
    systemPrompt: asString(parsed.systemPrompt),
    faqs,
    treatments: asTreatments(pickTreatmentList(parsed)),
    pages,
  };
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
  if (hasGemini()) {
    const ai = await aiExtract(
      combined,
      pages.map((p) => p.url),
    );
    return mergeExtract(new URL(homePage.url), base, ai);
  }
  return { ...emptyExtract(), ...base, pages: pages.map((p) => p.url) };
}
