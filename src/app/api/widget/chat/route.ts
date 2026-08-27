import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { replyAsClinic } from "@/lib/openai";
import { mutateStore, readStore } from "@/lib/store";
import { loadWidget, widgetAllowed } from "@/lib/widget";

export async function POST(request: Request) {
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

  const store = await readStore();
  const conversation = store.conversations.find(
    (c) => c.id === conversationId && c.organizationId === loaded.org.id,
  );
  if (!conversation) return NextResponse.json({ error: "Unknown conversation" }, { status: 404 });

  const history = store.messages
    .filter((m) => m.conversationId === conversationId && m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  const knowledge = store.knowledgeItems.filter((k) => k.chatbotId === loaded.bot.id);

  const reply = await replyAsClinic({
    systemPrompt: loaded.bot.systemPrompt,
    knowledge,
    history,
    userMessage: content,
  });

  await mutateStore((data) => {
    data.messages.push({
      id: randomUUID(),
      conversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    });
    data.messages.push({
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: reply,
      createdAt: new Date().toISOString(),
    });
  });

  return NextResponse.json({ reply });
}
