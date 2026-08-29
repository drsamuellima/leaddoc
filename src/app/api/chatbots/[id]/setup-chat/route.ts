import { NextResponse } from "next/server";
import { deriveChecklist, ensureSetup } from "@/lib/chatbot-setup";
import { mutateOwnedSetup, setupPayload } from "@/lib/setup-state";
import { runInterviewTurn, shouldAdvanceToBooking } from "@/lib/setup-interview";

export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const body = await request.json().catch(() => null);
  const start = Boolean(body?.start);
  const message = String(body?.message || "");
  const confirmField = String(body?.confirm?.field || "");
  const confirm =
    confirmField === "name" || confirmField === "phone" || confirmField === "booking" || confirmField === "treatments"
      ? { field: confirmField as "name" | "phone" | "booking" | "treatments", accepted: Boolean(body?.confirm?.accepted) }
      : undefined;

  try {
    const snapshot = await mutateOwnedSetup(id, async (data, bot) => {
      bot.setup = ensureSetup(bot);
      const options = data.chatbotOptions.filter((o) => o.chatbotId === bot.id);
      const faqs = data.knowledgeItems.filter((k) => k.chatbotId === bot.id);
      const checklist = deriveChecklist(bot, options, faqs);
      await runInterviewTurn({ data, bot, checklist, userMessage: message, start, confirm });
      bot.setup.step = "interview";
      const payload = setupPayload(data, bot);
      const optionsAfter = data.chatbotOptions.filter((o) => o.chatbotId === bot.id);
      const faqsAfter = data.knowledgeItems.filter((k) => k.chatbotId === bot.id);
      return { ...payload, advanceToBooking: shouldAdvanceToBooking(bot, optionsAfter, faqsAfter) };
    });

    if (!snapshot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    return NextResponse.json(snapshot);
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "AI interview failed";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
