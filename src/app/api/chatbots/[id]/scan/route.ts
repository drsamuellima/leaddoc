import { NextResponse } from "next/server";
import { clientIp } from "@/lib/config";
import { ensureSetup } from "@/lib/chatbot-setup";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { mutateStore } from "@/lib/store";
import { loadOwnedBot, setupPayload } from "@/lib/setup-state";
import { scanPracticeSite } from "@/lib/site-scan";

export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`scan:${clientIp(request)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(rateLimitResponse(), { status: 429 });
  }
  const { id } = await ctx.params;
  const owned = await loadOwnedBot(id);
  if (!owned) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const url = String(body?.url || "").trim();
  if (!url) return NextResponse.json({ error: "Paste your practice website" }, { status: 400 });

  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === id && b.organizationId === owned.org.id);
    if (!bot) return;
    bot.setup = ensureSetup(bot);
    bot.setup.websiteUrl = url;
    bot.setup.scanStatus = "scanning";
    bot.setup.scanError = "";
  });

  try {
    const extract = await scanPracticeSite(url);
    const snapshot = await mutateStore((data) => {
      const bot = data.chatbots.find((b) => b.id === id && b.organizationId === owned.org.id);
      if (!bot) return null;
      bot.setup = ensureSetup(bot);
      bot.setup.websiteUrl = url;
      bot.setup.scanStatus = "ready";
      bot.setup.scanError = "";
      bot.setup.pendingExtract = extract;
      bot.setup.step = "knowledge";
      bot.setup.checklist.website = true;
      if (extract.name.trim()) bot.name = extract.name.trim();
      bot.phone = extract.phone.trim();
      bot.bookingUrl = extract.bookingUrl.trim();
      return setupPayload(data, bot);
    });
    if (!snapshot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    return NextResponse.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    const snapshot = await mutateStore((data) => {
      const bot = data.chatbots.find((b) => b.id === id && b.organizationId === owned.org.id);
      if (!bot) return null;
      bot.setup = ensureSetup(bot);
      bot.setup.websiteUrl = url;
      bot.setup.scanStatus = "error";
      bot.setup.scanError = message;
      return setupPayload(data, bot);
    });
    return NextResponse.json({ error: message, ...(snapshot || {}) }, { status: 400 });
  }
}
