import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { sendLeadEmail } from "@/lib/email";
import { replyAsClinic } from "@/lib/openai";
import { applyPipelineToLead, matchPipeline, stageIdForStatus } from "@/lib/pipelines";
import { loadWidget, widgetAllowed } from "@/lib/widget";

export async function POST(request: Request) {
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

  const knowledge = (await readStore()).knowledgeItems.filter((k) => k.chatbotId === loaded.bot.id);
  const reply = await replyAsClinic({
    systemPrompt: loaded.bot.systemPrompt,
    knowledge,
    history: [],
    userMessage: inquiry,
  });

  const created = await mutateStore((data) => {
    const conversationId = randomUUID();
    const leadId = randomUUID();
    const at = new Date().toISOString();
    data.conversations.push({
      id: conversationId,
      organizationId: loaded.org.id,
      chatbotId: loaded.bot.id,
      leadId,
      createdAt: at,
    });
    const orgPipes = data.pipelines.filter((p) => p.organizationId === loaded.org.id);
    const pipeline = matchPipeline(inquiry, orgPipes);
    const leadRecord = {
      id: leadId,
      organizationId: loaded.org.id,
      chatbotId: loaded.bot.id,
      conversationId,
      name,
      email,
      phone,
      inquiry,
      status: "new" as const,
      assignedTo: null,
      followUpAt: null,
      notes: "",
      treatment: pipeline?.name || "",
      pipelineId: pipeline?.id || null,
      stageId: pipeline ? stageIdForStatus(pipeline, "new") : null,
      amountPence: null,
      createdAt: at,
    };
    if (pipeline) applyPipelineToLead(leadRecord, pipeline, stageIdForStatus(pipeline, "new"));
    data.leads.push(leadRecord);
    data.messages.push(
      { id: randomUUID(), conversationId, role: "user", content: inquiry, createdAt: at },
      { id: randomUUID(), conversationId, role: "assistant", content: reply, createdAt: at },
    );
    data.notifications.push({
      id: randomUUID(),
      organizationId: loaded.org.id,
      type: "new_lead",
      title: `New lead: ${name}`,
      body: inquiry,
      leadId,
      readAt: null,
      createdAt: at,
    });
    if (!Array.isArray(data.leadTasks)) data.leadTasks = [];
    if (!Array.isArray(data.leadEvents)) data.leadEvents = [];
    data.leadEvents.push({
      id: randomUUID(),
      leadId,
      body: "Enquiry captured from the website widget.",
      createdAt: at,
    });
    return { conversationId, leadId, reply };
  });

  const store = await readStore();
  const owners = store.profiles.filter(
    (p) => p.organizationId === loaded.org.id && (p.role === "clinic_owner" || p.role === "clinic_staff"),
  );
  await sendLeadEmail(owners[0]?.email || "", { name, email, phone, inquiry });

  return NextResponse.json(created);
}
