import { NextResponse } from "next/server";
import { clientIp } from "@/lib/config";
import { replyAsClinic } from "@/lib/gemini";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { appendChatTurn, listBotKnowledge, listConversationMessages } from "@/lib/store";
import { loadWidget, widgetAllowed } from "@/lib/widget";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!rateLimit(`widget-chat:${clientIp(request)}`, 30, 60 * 1000)) {
    return NextResponse.json(rateLimitResponse(), { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const widgetKey = String(body.widgetKey || "");
  const conversationId = String(body.conversationId || "");
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const loaded = await loadWidget(widgetKey);
  if (!loaded) return NextResponse.json({ error: "Unknown widget" }, { status: 404 });
  if (!widgetAllowed(loaded.org)) {
    return NextResponse.json({ error: "This chat is temporarily unavailable" }, { status: 402 });
  }

  const messages = await listConversationMessages(loaded.org.id, conversationId);
  if (!messages) return NextResponse.json({ error: "Unknown conversation" }, { status: 404 });

  const history = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const knowledge = await listBotKnowledge(loaded.bot.id);

  let reply: string;
  try {
    reply = await replyAsClinic({
      systemPrompt: loaded.bot.systemPrompt,
      knowledge,
      history,
      userMessage: content,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "AI reply failed";
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  await appendChatTurn(conversationId, content, reply);

  return NextResponse.json({ reply });
}
