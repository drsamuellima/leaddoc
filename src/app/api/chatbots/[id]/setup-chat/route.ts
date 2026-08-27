import { NextResponse } from "next/server";
import { deriveChecklist, ensureSetup } from "@/lib/chatbot-setup";
import { mutateStore } from "@/lib/store";
import { loadOwnedBot, setupPayload } from "@/lib/setup-state";
import { runInterviewTurn } from "@/lib/setup-interview";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwnedBot(id);
  if (!owned) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const start = Boolean(body?.start);
  const message = String(body?.message || "");

  const snapshot = await mutateStore(async (data) => {
    const bot = data.chatbots.find((b) => b.id === id && b.organizationId === owned.org.id);
    if (!bot) return null;
    bot.setup = ensureSetup(bot);
    const options = data.chatbotOptions.filter((o) => o.chatbotId === bot.id);
    const faqs = data.knowledgeItems.filter((k) => k.chatbotId === bot.id);
    const checklist = deriveChecklist(bot, options, faqs);
    await runInterviewTurn({ data, bot, checklist, userMessage: message, start });
    bot.setup.step = "interview";
    return setupPayload(data, bot);
  });

  if (!snapshot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  return NextResponse.json(snapshot);
}
