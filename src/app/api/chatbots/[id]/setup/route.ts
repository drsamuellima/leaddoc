import { NextResponse } from "next/server";
import {
  applyExtractToBot,
  emptyExtract,
  ensureSetup,
  faqsFromDrafts,
  parseSetupStep,
  treatmentsFromDrafts,
} from "@/lib/chatbot-setup";
import { mutateOwnedSetup, setupPayload } from "@/lib/setup-state";
import { nextFactToConfirm } from "@/lib/setup-interview";
import type { SetupExtract, SetupFaqDraft, SetupTreatmentDraft } from "@/lib/types";
import { parseActionType } from "@/lib/types";

export const maxDuration = 60;

function asFaqs(value: unknown): SetupFaqDraft[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((row) => ({
    title: String((row as { title?: string }).title || "FAQ"),
    question: String((row as { question?: string }).question || ""),
    answer: String((row as { answer?: string }).answer || ""),
    source: (row as { source?: string }).source === "suggested" ? ("suggested" as const) : ("site" as const),
  }));
}

function asTreatments(value: unknown): SetupTreatmentDraft[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .map((row) => ({
      label: String((row as { label?: string }).label || "").trim(),
      actionType: parseActionType(String((row as { actionType?: string }).actionType || "lead")),
      starterMessage: String((row as { starterMessage?: string }).starterMessage || "").trim(),
      url: String((row as { url?: string }).url || "").trim(),
    }))
    .filter((row) => row.label)
    .map((row) => ({
      ...row,
      starterMessage: row.starterMessage || `I'd like to ask about ${row.label}.`,
    }));
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const snapshot = await mutateOwnedSetup(id, (data, bot) => {
    bot.setup = ensureSetup(bot);

    if (typeof body.step === "string") {
      bot.setup.step = parseSetupStep(body.step);
      if (bot.setup.step === "interview") {
        const options = data.chatbotOptions.filter((o) => o.chatbotId === bot.id);
        const needsConfirm = nextFactToConfirm(bot, options);
        const hasConfirmUi = bot.setup.interview.some((msg) => Boolean(msg.confirm));
        if (needsConfirm && !hasConfirmUi) {
          bot.setup.interview = [];
          bot.setup.confirmed = {};
          bot.setup.awaitingField = undefined;
        }
      }
    }
    if (typeof body.websiteUrl === "string") bot.setup.websiteUrl = body.websiteUrl.trim();
    if (typeof body.name === "string" && body.name.trim()) bot.name = body.name.trim();
    if (typeof body.phone === "string") bot.phone = body.phone.trim();
    if (typeof body.bookingUrl === "string") bot.bookingUrl = body.bookingUrl.trim();
    if (typeof body.avatarName === "string") bot.avatarName = body.avatarName.trim();
    if (typeof body.systemPrompt === "string" && body.systemPrompt.trim()) bot.systemPrompt = body.systemPrompt.trim();
    if (Array.isArray(body.greetings)) {
      const greetings = body.greetings.map((g) => String(g).trim()).filter(Boolean);
      if (greetings.length) {
        bot.greetings = greetings;
        bot.greeting = greetings[0];
      }
    }

    const pendingFaqs = asFaqs(body.pendingFaqs);
    if (pendingFaqs && bot.setup.pendingExtract) {
      bot.setup.pendingExtract.faqs = pendingFaqs;
    }
    const pendingTreatments = asTreatments(body.pendingTreatments);
    if (pendingTreatments) {
      if (!bot.setup.pendingExtract) bot.setup.pendingExtract = emptyExtract();
      bot.setup.pendingExtract.treatments = pendingTreatments;
    }

    if (body.approveKnowledge === true && bot.setup.pendingExtract) {
      const extract = bot.setup.pendingExtract as SetupExtract;
      applyExtractToBot(bot, extract);
      const faqs = faqsFromDrafts(bot.id, extract.faqs || []);
      data.knowledgeItems = data.knowledgeItems.filter((k) => k.chatbotId !== bot.id).concat(faqs);
      if (extract.treatments?.length) {
        const treatments = treatmentsFromDrafts(bot.id, extract.treatments);
        if (treatments.length) {
          data.chatbotOptions = data.chatbotOptions.filter((o) => o.chatbotId !== bot.id).concat(treatments);
        }
      }
      bot.setup.checklist.knowledge = true;
      bot.setup.step = "interview";
      bot.setup.interview = [];
      bot.setup.confirmed = {};
      bot.setup.awaitingField = undefined;
    }

    if (body.applyPrescriptions === true) {
      const treatments = pendingTreatments || asTreatments(bot.setup.pendingExtract?.treatments || []);
      if (treatments?.length) {
        const next = treatmentsFromDrafts(bot.id, treatments);
        data.chatbotOptions = data.chatbotOptions.filter((o) => o.chatbotId !== bot.id).concat(next);
        if (bot.setup.pendingExtract) bot.setup.pendingExtract.treatments = treatments;
        else bot.setup.pendingExtract = { ...emptyExtract(), treatments };
      }
      bot.setup.checklist.treatments = data.chatbotOptions.some((o) => o.chatbotId === bot.id);
    }

    if (body.enterClinic === true) {
      bot.setupComplete = true;
      bot.setup.step = "live";
    }

    if (body.goLive === true) {
      bot.active = true;
      bot.setupComplete = true;
      bot.setup.step = "live";
    }

    return setupPayload(data, bot);
  });

  if (!snapshot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  return NextResponse.json(snapshot);
}
