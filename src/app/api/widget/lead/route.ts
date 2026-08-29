import { NextResponse } from "next/server";
import { clientIp } from "@/lib/config";
import { sendLeadEmail } from "@/lib/email";
import { replyAsClinic } from "@/lib/gemini";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { clinicNotifyEmail, createWidgetLead, listBotKnowledge } from "@/lib/store";
import { loadWidget, widgetAllowed } from "@/lib/widget";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!rateLimit(`widget-lead:${clientIp(request)}`, 20, 60 * 1000)) {
    return NextResponse.json(rateLimitResponse(), { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const widgetKey = String(body.widgetKey || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const inquiry = String(body.inquiry || "").trim();
  if (!name || !email || !phone || !inquiry) {
    return NextResponse.json({ error: "Name, email, phone and inquiry are required" }, { status: 400 });
  }
  const loaded = await loadWidget(widgetKey);
  if (!loaded) return NextResponse.json({ error: "Unknown widget" }, { status: 404 });
  if (!widgetAllowed(loaded.org)) {
    return NextResponse.json({ error: "This chat is temporarily unavailable" }, { status: 402 });
  }

  const knowledge = await listBotKnowledge(loaded.bot.id);
  let reply: string;
  try {
    reply = await replyAsClinic({
      systemPrompt: loaded.bot.systemPrompt,
      knowledge,
      history: [],
      userMessage: inquiry,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "AI reply failed";
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  const created = await createWidgetLead({
    orgId: loaded.org.id,
    botId: loaded.bot.id,
    name,
    email,
    phone,
    inquiry,
    reply,
  });

  await sendLeadEmail(await clinicNotifyEmail(loaded.org.id), { name, email, phone, inquiry });

  return NextResponse.json(created);
}
