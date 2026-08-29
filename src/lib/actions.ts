"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import {
  IMPERSONATE_COOKIE,
  clearSession,
  getClinicContext,
  requireAdmin,
  requireUser,
  setImpersonate,
  setSession,
} from "./auth";
import { generatePassword, hashPassword, hashToken, randomToken, verifyPassword, widgetKey } from "./crypto";
import { sendInviteEmail, sendPasswordResetEmail } from "./email";
import { allowDemoFallbacks } from "./config";
import { appUrl, hasStripe, stripeGet, stripeRequest } from "./integrations";
import { createClinicSignup } from "./clinic-signup";
import { mutateStore, readStore, slugify } from "./store";
import { knowledgeKey, KNOWLEDGE_PACKS } from "./knowledge-examples";
import { parseActionType, parseWidgetFont, parseWidgetStyle, widgetFieldDefaults, type ChatbotActionType, type StoreData, type SubscriptionStatus } from "./types";
import { completedSetup, emptySetup } from "./chatbot-setup";
import { isLeadStatus, LEAD_STAGE_LABELS } from "./leads";
import { applyPipelineToLead, findPipeline, generalPipeline, parseGbpToPence, sortedStages } from "./pipelines";

function iso() {
  return new Date().toISOString();
}

function parseGreetings(formData: FormData, fallback: string[]): string[] {
  const lines = String(formData.get("greetingsText") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
}

function emptyOrgContact() {
  return { phone: "", bookingUrl: "" };
}

function defaultTreatments(chatbotId: string): {
  id: string;
  chatbotId: string;
  label: string;
  starterMessage: string;
  sortOrder: number;
  actionType: ChatbotActionType;
  url: string;
}[] {
  return [
    {
      id: randomUUID(),
      chatbotId,
      label: "Book an appointment",
      starterMessage: "I'd like to book an appointment.",
      sortOrder: 0,
      actionType: "book",
      url: "",
    },
    {
      id: randomUUID(),
      chatbotId,
      label: "Call the practice",
      starterMessage: "I'd like to call the practice.",
      sortOrder: 1,
      actionType: "call",
      url: "",
    },
    {
      id: randomUUID(),
      chatbotId,
      label: "Send a general enquiry",
      starterMessage: "I have a general enquiry.",
      sortOrder: 2,
      actionType: "lead",
      url: "",
    },
  ];
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const store = await readStore();
  const user = store.profiles.find((p) => p.email.toLowerCase() === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }
  await setSession(user.id);
  redirect(user.role === "super_admin" ? "/admin" : "/app");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const clinicName = String(formData.get("clinicName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!name || !clinicName || !email || password.length < 8) {
    redirect("/signup?error=invalid");
  }
  const result = await createClinicSignup({ name, clinicName, email, password });
  if ("error" in result) redirect("/signup?error=exists");
  await setSession(result.userId);
  redirect(`/app/chatbots/${result.botId}/setup`);
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function startCheckoutAction() {
  const { org, user } = await getClinicContext();
  const store = await readStore();
  const plan = store.plans.find((p) => p.active);
  if (!plan) redirect("/app/settings?error=noplan");
  if (!hasStripe()) {
    if (!allowDemoFallbacks()) redirect("/app/settings?error=nostripe");
    await mutateStore((data) => {
      const o = data.organizations.find((x) => x.id === org.id);
      if (o) o.subscriptionStatus = "active";
    });
    redirect("/app/settings?ok=demo-sub");
  }
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${appUrl()}/app/settings?ok=paid`);
  params.set("cancel_url", `${appUrl()}/app/settings?error=cancel`);
  params.set("customer_email", user.email);
  params.set("client_reference_id", org.id);
  if (plan.stripePriceId) {
    params.set("line_items[0][price]", plan.stripePriceId);
  } else {
    params.set("line_items[0][price_data][currency]", "gbp");
    params.set("line_items[0][price_data][product_data][name]", plan.name);
    params.set("line_items[0][price_data][unit_amount]", String(plan.amountPence));
    params.set("line_items[0][price_data][recurring][interval]", "month");
  }
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[organization_id]", org.id);
  const session = await stripeRequest("checkout/sessions", params);
  redirect(session.url);
}

export async function startBillingPortalAction() {
  const { org } = await getClinicContext();
  if (!hasStripe() || !org.stripeCustomerId) {
    redirect("/app/settings?error=nobilling");
  }
  const params = new URLSearchParams();
  params.set("customer", org.stripeCustomerId);
  params.set("return_url", `${appUrl()}/app/settings`);
  const session = await stripeRequest("billing_portal/sessions", params);
  redirect(session.url);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const token = randomToken();
  const shouldSend = await mutateStore((data) => {
    if (!Array.isArray(data.passwordResetTokens)) data.passwordResetTokens = [];
    data.passwordResetTokens = data.passwordResetTokens.filter((t) => t.email !== email);
    const user = data.profiles.find((p) => p.email.toLowerCase() === email);
    if (!user) return false;
    data.passwordResetTokens.push({
      id: randomUUID(),
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    return true;
  });
  if (shouldSend) await sendPasswordResetEmail(email, token);
  redirect("/forgot-password?ok=sent");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (!token || password.length < 8) redirect("/reset-password?error=invalid");
  const tokenHash = hashToken(token);
  const ok = await mutateStore((data) => {
    if (!Array.isArray(data.passwordResetTokens)) data.passwordResetTokens = [];
    const now = Date.now();
    const row = data.passwordResetTokens.find((t) => t.tokenHash === tokenHash && new Date(t.expiresAt).getTime() > now);
    if (!row) return false;
    const user = data.profiles.find((p) => p.email.toLowerCase() === row.email);
    if (!user) return false;
    user.passwordHash = hashPassword(password);
    data.passwordResetTokens = data.passwordResetTokens.filter((t) => t.email !== row.email);
    return true;
  });
  if (!ok) redirect("/reset-password?error=expired");
  redirect("/login?ok=reset");
}

export async function saveChatbotAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === id && b.organizationId === org.id);
    if (!bot) return;
    bot.name = String(formData.get("name") || bot.name);
    bot.systemPrompt = String(formData.get("systemPrompt") || bot.systemPrompt);
    bot.active = formData.get("active") === "on";
    bot.accentColor = String(formData.get("accentColor") || bot.accentColor || org.primaryColor);
    bot.panelColor = String(formData.get("panelColor") || bot.panelColor || "#ffffff");
    bot.buttonTextColor = String(formData.get("buttonTextColor") || bot.buttonTextColor || "#1a1a1a");
    bot.widgetStyle = parseWidgetStyle(String(formData.get("widgetStyle") || bot.widgetStyle || "orbital"));
    bot.fontFamily = parseWidgetFont(String(formData.get("fontFamily") || bot.fontFamily || "system"));
    bot.surfaceColor = String(formData.get("surfaceColor") || bot.surfaceColor || "#f4f4f0");
    bot.userBubbleColor = String(formData.get("userBubbleColor") || bot.userBubbleColor || bot.accentColor);
    bot.assistantBubbleColor = String(formData.get("assistantBubbleColor") || bot.assistantBubbleColor || "#f3f4f6");
    bot.launcherColor = String(formData.get("launcherColor") || bot.launcherColor || bot.accentColor);
    bot.avatarName = String(formData.get("avatarName") || "").trim();
    bot.avatarImageUrl = String(formData.get("avatarImageUrl") || "").trim();
    bot.phone = String(formData.get("phone") || "").trim();
    bot.bookingUrl = String(formData.get("bookingUrl") || "").trim();
    const greetings = parseGreetings(formData, bot.greetings?.length ? bot.greetings : [bot.greeting]);
    bot.greetings = greetings;
    bot.greeting = greetings[0] || bot.greeting;
  });
  redirect(`/app/chatbots/${id}?ok=saved`);
}

function removeChatbotRecords(data: StoreData, chatbotId: string) {
  data.chatbots = data.chatbots.filter((b) => b.id !== chatbotId);
  data.chatbotOptions = data.chatbotOptions.filter((o) => o.chatbotId !== chatbotId);
  data.knowledgeItems = data.knowledgeItems.filter((k) => k.chatbotId !== chatbotId);
}

export async function createChatbotAction(_formData: FormData) {
  const { org } = await getClinicContext();
  const id = await mutateStore((data) => {
    const botId = randomUUID();
    data.chatbots.push({
      id: botId,
      organizationId: org.id,
      name: "New chatbot",
      ...widgetFieldDefaults(org.name, org.primaryColor),
      systemPrompt: `You are a helpful receptionist for ${org.name}.`,
      widgetKey: widgetKey(),
      active: false,
      createdAt: iso(),
      setupComplete: false,
      setup: emptySetup("prescriptions"),
    });
    return botId;
  });
  redirect(`/app/chatbots/${id}/setup`);
}

export async function deleteChatbotAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === id && b.organizationId === org.id);
    if (!bot) return;
    removeChatbotRecords(data, id);
  });
  redirect("/app/chatbots?ok=deleted");
}

export async function addOptionAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  const label = String(formData.get("label") || "").trim();
  const starterMessage = String(formData.get("starterMessage") || "").trim();
  const actionType = parseActionType(String(formData.get("actionType") || "lead"));
  const url = String(formData.get("url") || "").trim();
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot || !label) return;
    const sortOrder = data.chatbotOptions.filter((o) => o.chatbotId === chatbotId).length;
    data.chatbotOptions.push({
      id: randomUUID(),
      chatbotId,
      label,
      starterMessage: starterMessage || label,
      sortOrder,
      actionType,
      url,
    });
  });
  redirect(`/app/chatbots/${chatbotId}`);
}

export async function updateOptionAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  const optionId = String(formData.get("optionId") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot) return;
    const opt = data.chatbotOptions.find((o) => o.id === optionId && o.chatbotId === chatbotId);
    if (!opt) return;
    const label = String(formData.get("label") || "").trim();
    if (label) opt.label = label;
    opt.starterMessage = String(formData.get("starterMessage") || "").trim() || opt.label;
    opt.actionType = parseActionType(String(formData.get("actionType") || opt.actionType));
    opt.url = String(formData.get("url") || "").trim();
  });
  redirect(`/app/chatbots/${chatbotId}`);
}

export async function deleteOptionAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  const optionId = String(formData.get("optionId") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot) return;
    data.chatbotOptions = data.chatbotOptions.filter((o) => o.id !== optionId);
  });
  redirect(`/app/chatbots/${chatbotId}`);
}

export async function addKnowledgeAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot) return;
    const title = String(formData.get("title") || "FAQ").trim();
    const question = String(formData.get("question") || "").trim();
    const answer = String(formData.get("answer") || "").trim();
    const exists = data.knowledgeItems.some(
      (k) => k.chatbotId === chatbotId && knowledgeKey(k) === knowledgeKey({ title, question }),
    );
    if (!exists && question && answer) {
      data.knowledgeItems.push({
        id: randomUUID(),
        chatbotId,
        title: title || "FAQ",
        question,
        answer,
      });
    }
  });
  redirect(`/app/chatbots/${chatbotId}#knowledge`);
}

export async function addKnowledgePackAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  const packId = String(formData.get("packId") || "");
  const pack = KNOWLEDGE_PACKS.find((p) => p.id === packId);
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot || !pack) return;
    const existing = new Set(
      data.knowledgeItems.filter((k) => k.chatbotId === chatbotId).map((k) => knowledgeKey(k)),
    );
    for (const item of pack.items) {
      if (existing.has(knowledgeKey(item))) continue;
      existing.add(knowledgeKey(item));
      data.knowledgeItems.push({
        id: randomUUID(),
        chatbotId,
        title: item.title,
        question: item.question,
        answer: item.answer,
      });
    }
  });
  redirect(`/app/chatbots/${chatbotId}#knowledge`);
}

export async function updateKnowledgeAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  const knowledgeId = String(formData.get("knowledgeId") || "");
  const title = String(formData.get("title") || "FAQ").trim();
  const question = String(formData.get("question") || "").trim();
  const answer = String(formData.get("answer") || "").trim();
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot || !question || !answer) return;
    const item = data.knowledgeItems.find((k) => k.id === knowledgeId && k.chatbotId === chatbotId);
    if (!item) return;
    item.title = title || "FAQ";
    item.question = question;
    item.answer = answer;
  });
  redirect(`/app/chatbots/${chatbotId}#knowledge`);
}

export async function deleteKnowledgeAction(formData: FormData) {
  const { org } = await getClinicContext();
  const chatbotId = String(formData.get("chatbotId") || "");
  const knowledgeId = String(formData.get("knowledgeId") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === chatbotId && b.organizationId === org.id);
    if (!bot) return;
    data.knowledgeItems = data.knowledgeItems.filter((k) => k.id !== knowledgeId);
  });
  redirect(`/app/chatbots/${chatbotId}#knowledge`);
}

export async function saveBrandingAction(formData: FormData) {
  const { org } = await getClinicContext();
  await mutateStore((data) => {
    const o = data.organizations.find((x) => x.id === org.id);
    if (!o) return;
    o.name = String(formData.get("name") || o.name);
    o.primaryColor = String(formData.get("primaryColor") || o.primaryColor);
    o.logoUrl = String(formData.get("logoUrl") || "");
    o.welcomeImageUrl = String(formData.get("welcomeImageUrl") || "");
    o.phone = String(formData.get("phone") || "").trim();
    o.bookingUrl = String(formData.get("bookingUrl") || "").trim();
  });
  redirect("/app/settings?ok=branding");
}

export async function inviteStaffAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  if (user.role === "clinic_staff") redirect("/app/settings?error=forbidden");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!name || !email) redirect("/app/settings?error=invalid");
  const password = String(formData.get("password") || "").trim() || generatePassword();
  const created = await mutateStore((data) => {
    if (data.profiles.some((p) => p.email.toLowerCase() === email)) return false;
    data.profiles.push({
      id: randomUUID(),
      organizationId: org.id,
      role: "clinic_staff",
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: iso(),
    });
    return true;
  });
  if (created) await sendInviteEmail(email, { name, clinicName: org.name, password });
  redirect(created ? "/app/settings?ok=staff" : "/app/settings?error=exists");
}

export async function updateLeadAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const tab = String(formData.get("tab") || "activity");
  await mutateStore((data) => {
    const lead = data.leads.find((l) => l.id === id && l.organizationId === org.id);
    if (!lead) return;
    if (!Array.isArray(data.leadEvents)) data.leadEvents = [];
    const prevStatus = lead.status;
    const prevAssigned = lead.assignedTo;
    const prevPipeline = lead.pipelineId;
    const prevStage = lead.stageId;
    lead.name = String(formData.get("name") || lead.name).trim() || lead.name;
    lead.email = String(formData.get("email") || lead.email).trim() || lead.email;
    lead.phone = String(formData.get("phone") || lead.phone).trim() || lead.phone;
    lead.inquiry = String(formData.get("inquiry") || lead.inquiry);
    const amount = parseGbpToPence(String(formData.get("amount") || ""));
    if (formData.has("amount")) lead.amountPence = amount;
    const orgPipes = data.pipelines.filter((p) => p.organizationId === org.id);
    const pipeline = findPipeline(orgPipes, String(formData.get("pipelineId") || lead.pipelineId));
    if (pipeline) {
      applyPipelineToLead(lead, pipeline, String(formData.get("stageId") || lead.stageId));
    } else {
      const nextStatus = String(formData.get("status") || lead.status);
      lead.status = isLeadStatus(nextStatus) ? nextStatus : lead.status;
    }
    lead.assignedTo = String(formData.get("assignedTo") || "") || null;
    lead.followUpAt = String(formData.get("followUpAt") || "") || null;
    lead.notes = String(formData.get("notes") || lead.notes);
    if (prevPipeline !== lead.pipelineId || prevStage !== lead.stageId || prevStatus !== lead.status) {
      const pipe = findPipeline(orgPipes, lead.pipelineId);
      const stage = pipe?.stages.find((s) => s.id === lead.stageId);
      data.leadEvents.push({
        id: randomUUID(),
        leadId: lead.id,
        body: `${user.name} moved this enquiry to ${stage?.name || LEAD_STAGE_LABELS[lead.status]} (${pipe?.name || "pipeline"}).`,
        createdAt: iso(),
      });
    }
    if (prevAssigned !== lead.assignedTo) {
      const assignee = data.profiles.find((p) => p.id === lead.assignedTo);
      data.leadEvents.push({
        id: randomUUID(),
        leadId: lead.id,
        body: lead.assignedTo
          ? `${user.name} assigned this enquiry to ${assignee?.name || "a teammate"}.`
          : `${user.name} removed the assigned clinician.`,
        createdAt: iso(),
      });
    }
  });
  const suffix = tab && tab !== "activity" ? `?ok=saved&tab=${encodeURIComponent(tab)}` : "?ok=saved";
  redirect(`/app/leads/${id}${suffix}`);
}

export async function createLeadTaskAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  const leadId = String(formData.get("leadId") || "");
  const tab = String(formData.get("tab") || "followups");
  const title = String(formData.get("title") || "").trim();
  await mutateStore((data) => {
    if (!title) return;
    const lead = data.leads.find((l) => l.id === leadId && l.organizationId === org.id);
    if (!lead) return;
    if (!Array.isArray(data.leadTasks)) data.leadTasks = [];
    data.leadTasks.push({
      id: randomUUID(),
      leadId: lead.id,
      title,
      body: String(formData.get("body") || "").trim(),
      dueAt: String(formData.get("dueAt") || "") || null,
      important: String(formData.get("important") || "") === "1",
      completedAt: null,
      createdBy: user.id,
      createdAt: iso(),
    });
  });
  const suffix = tab && tab !== "activity" ? `?ok=task&tab=${encodeURIComponent(tab)}` : "?ok=task";
  redirect(`/app/leads/${leadId}${suffix}`);
}

export async function completeLeadTaskAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const leadId = String(formData.get("leadId") || "");
  const tab = String(formData.get("tab") || "followups");
  await mutateStore((data) => {
    const lead = data.leads.find((l) => l.id === leadId && l.organizationId === org.id);
    if (!lead) return;
    const task = (data.leadTasks || []).find((t) => t.id === id && t.leadId === lead.id);
    if (!task || task.completedAt) return;
    task.completedAt = iso();
  });
  const suffix = tab && tab !== "activity" ? `?ok=task&tab=${encodeURIComponent(tab)}` : "?ok=task";
  redirect(`/app/leads/${leadId}${suffix}`);
}

function purgeLeads(data: StoreData, orgId: string, ids: string[]) {
  const allowed = new Set(
    data.leads.filter((l) => l.organizationId === orgId && ids.includes(l.id)).map((l) => l.id),
  );
  if (allowed.size === 0) return [];
  const conversationIds = new Set(
    data.leads.filter((l) => allowed.has(l.id)).map((l) => l.conversationId).filter(Boolean),
  );
  data.leads = data.leads.filter((l) => !allowed.has(l.id));
  data.conversations = data.conversations.filter((c) => !conversationIds.has(c.id) && !allowed.has(c.leadId || ""));
  data.messages = data.messages.filter((m) => !conversationIds.has(m.conversationId));
  data.leadTasks = (data.leadTasks || []).filter((t) => !allowed.has(t.leadId));
  data.leadEvents = (data.leadEvents || []).filter((e) => !allowed.has(e.leadId));
  data.leadNotes = (data.leadNotes || []).filter((n) => !allowed.has(n.leadId));
  data.leadRecalls = (data.leadRecalls || []).filter((n) => !allowed.has(n.leadId));
  data.notifications = data.notifications.filter((n) => !allowed.has(n.leadId));
  return [...allowed];
}

export async function deleteLeadsAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  const ids = formData
    .getAll("ids")
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  await mutateStore((data) => {
    const removed = purgeLeads(data, org.id, ids);
    if (removed.length === 0) return;
    data.auditLogs.push({
      id: randomUUID(),
      actorId: user.id,
      action: "delete_leads",
      organizationId: org.id,
      detail: `${user.email} deleted ${removed.length} lead(s)`,
      createdAt: iso(),
    });
  });
  redirect("/app/leads?ok=deleted");
}

function safeLeadsReturn(path: string) {
  return path.startsWith("/app/leads") ? path : "/app/leads";
}

export async function patchLeadInlineAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const back = safeLeadsReturn(String(formData.get("returnTo") || "/app/leads"));
  await mutateStore((data) => {
    const lead = data.leads.find((l) => l.id === id && l.organizationId === org.id);
    if (!lead) return;
    if (!Array.isArray(data.leadEvents)) data.leadEvents = [];
    const orgPipes = data.pipelines.filter((p) => p.organizationId === org.id);
    if (formData.has("amount")) {
      lead.amountPence = parseGbpToPence(String(formData.get("amount") || ""));
    }
    if (formData.has("pipelineId")) {
      const pipeline = findPipeline(orgPipes, String(formData.get("pipelineId") || ""));
      if (pipeline) applyPipelineToLead(lead, pipeline, lead.pipelineId === pipeline.id ? lead.stageId : null);
    }
    if (formData.has("stageId")) {
      const pipeline = findPipeline(orgPipes, lead.pipelineId);
      if (pipeline) applyPipelineToLead(lead, pipeline, String(formData.get("stageId") || lead.stageId));
    }
    data.leadEvents.push({
      id: randomUUID(),
      leadId: lead.id,
      body: `${user.name} updated treatment, stage or value from the leads list.`,
      createdAt: iso(),
    });
  });
  redirect(back);
}

export async function createPipelineAction(formData: FormData) {
  const { org } = await getClinicContext();
  const name = String(formData.get("name") || "").trim();
  await mutateStore((data) => {
    if (!name) return;
    if (!Array.isArray(data.pipelines)) data.pipelines = [];
    const id = randomUUID();
    data.pipelines.push({
      id,
      organizationId: org.id,
      name,
      createdAt: iso(),
      stages: [
        { id: randomUUID(), name: "New enquiry", sortOrder: 0 },
        { id: randomUUID(), name: "In progress", sortOrder: 1 },
        { id: randomUUID(), name: "Booked", sortOrder: 2 },
        { id: randomUUID(), name: "Closed", sortOrder: 3 },
      ],
    });
  });
  redirect("/app/pipelines?ok=created");
}

export async function updatePipelineAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  await mutateStore((data) => {
    const pipeline = data.pipelines.find((p) => p.id === id && p.organizationId === org.id);
    if (!pipeline || !name) return;
    pipeline.name = name;
    data.leads
      .filter((l) => l.pipelineId === pipeline.id)
      .forEach((l) => {
        l.treatment = name;
      });
  });
  redirect(`/app/pipelines/${id}?ok=saved`);
}

export async function addPipelineStageAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("stageName") || "").trim();
  await mutateStore((data) => {
    const pipeline = data.pipelines.find((p) => p.id === id && p.organizationId === org.id);
    if (!pipeline || !name) return;
    const next = pipeline.stages.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;
    pipeline.stages.push({ id: randomUUID(), name, sortOrder: next });
  });
  redirect(`/app/pipelines/${id}?ok=saved`);
}

export async function updatePipelineStageAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const stageId = String(formData.get("stageId") || "");
  const name = String(formData.get("stageName") || "").trim();
  await mutateStore((data) => {
    const pipeline = data.pipelines.find((p) => p.id === id && p.organizationId === org.id);
    const stage = pipeline?.stages.find((s) => s.id === stageId);
    if (!stage || !name) return;
    stage.name = name;
  });
  redirect(`/app/pipelines/${id}?ok=saved`);
}

export async function deletePipelineStageAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const stageId = String(formData.get("stageId") || "");
  await mutateStore((data) => {
    const pipeline = data.pipelines.find((p) => p.id === id && p.organizationId === org.id);
    if (!pipeline || pipeline.stages.length <= 1) return;
    pipeline.stages = pipeline.stages.filter((s) => s.id !== stageId);
    const fallback = sortedStages(pipeline)[0];
    data.leads
      .filter((l) => l.pipelineId === pipeline.id && l.stageId === stageId)
      .forEach((l) => applyPipelineToLead(l, pipeline, fallback?.id));
  });
  redirect(`/app/pipelines/${id}?ok=saved`);
}

export async function deletePipelineAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  await mutateStore((data) => {
    const pipeline = data.pipelines.find((p) => p.id === id && p.organizationId === org.id);
    if (!pipeline) return;
    const remaining = data.pipelines.filter((p) => p.organizationId === org.id && p.id !== id);
    const fallback = remaining[0];
    if (!fallback) return;
    data.leads
      .filter((l) => l.pipelineId === id)
      .forEach((l) => applyPipelineToLead(l, fallback, null));
    data.pipelines = data.pipelines.filter((p) => p.id !== id);
  });
  redirect("/app/pipelines?ok=deleted");
}

export async function addLeadNoteAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  const leadId = String(formData.get("leadId") || "");
  const body = String(formData.get("body") || "").trim();
  await mutateStore((data) => {
    if (!body) return;
    const lead = data.leads.find((l) => l.id === leadId && l.organizationId === org.id);
    if (!lead) return;
    if (!Array.isArray(data.leadNotes)) data.leadNotes = [];
    data.leadNotes.push({
      id: randomUUID(),
      leadId: lead.id,
      body,
      authorId: user.id,
      createdAt: iso(),
    });
  });
  redirect(`/app/leads/${leadId}?tab=notes&ok=saved`);
}

export async function addLeadRecallAction(formData: FormData) {
  const { org, user } = await getClinicContext();
  const leadId = String(formData.get("leadId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const dueAt = String(formData.get("dueAt") || "");
  await mutateStore((data) => {
    if (!reason || !dueAt) return;
    const lead = data.leads.find((l) => l.id === leadId && l.organizationId === org.id);
    if (!lead) return;
    if (!Array.isArray(data.leadRecalls)) data.leadRecalls = [];
    data.leadRecalls.push({
      id: randomUUID(),
      leadId: lead.id,
      dueAt,
      reason,
      completedAt: null,
      createdBy: user.id,
      createdAt: iso(),
    });
  });
  redirect(`/app/leads/${leadId}?tab=recalls&ok=saved`);
}

export async function completeLeadRecallAction(formData: FormData) {
  const { org } = await getClinicContext();
  const id = String(formData.get("id") || "");
  const leadId = String(formData.get("leadId") || "");
  await mutateStore((data) => {
    const lead = data.leads.find((l) => l.id === leadId && l.organizationId === org.id);
    if (!lead) return;
    const recall = (data.leadRecalls || []).find((r) => r.id === id && r.leadId === lead.id);
    if (!recall || recall.completedAt) return;
    recall.completedAt = iso();
  });
  redirect(`/app/leads/${leadId}?tab=recalls&ok=saved`);
}

export async function markNotificationsReadAction() {
  const { org } = await getClinicContext();
  await mutateStore((data) => {
    data.notifications
      .filter((n) => n.organizationId === org.id && !n.readAt)
      .forEach((n) => {
        n.readAt = iso();
      });
  });
}

export async function adminCreateClinicAction(formData: FormData) {
  await requireAdmin();
  const clinicName = String(formData.get("clinicName") || "").trim();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!clinicName || !ownerName || !email || password.length < 8) {
    redirect("/admin/clinics/new?error=invalid");
  }
  const orgId = await mutateStore((data) => {
    const id = randomUUID();
    const userId = randomUUID();
    data.organizations.push({
      id,
      name: clinicName,
      slug: slugify(clinicName) + "-" + id.slice(0, 6),
      logoUrl: "",
      primaryColor: "#0f766e",
      welcomeImageUrl: "",
      ...emptyOrgContact(),
      stripeCustomerId: "",
      stripeSubscriptionId: "",
      subscriptionStatus: "inactive",
      allowWidgetWithoutSub: false,
      createdAt: iso(),
    });
    data.profiles.push({
      id: userId,
      organizationId: id,
      role: "clinic_owner",
      name: ownerName,
      email,
      passwordHash: hashPassword(password),
      createdAt: iso(),
    });
    return id;
  });
  redirect(`/admin/clinics/${orgId}`);
}

export async function impersonateAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  await setImpersonate(organizationId);
  await mutateStore((data) => {
    data.auditLogs.push({
      id: randomUUID(),
      actorId: admin.id,
      action: "impersonate",
      organizationId,
      detail: `${admin.email} opened clinic ${organizationId}`,
      createdAt: iso(),
    });
  });
  redirect("/app");
}

export async function exitImpersonateAction() {
  await requireAdmin();
  const jar = await cookies();
  jar.delete(IMPERSONATE_COOKIE);
  redirect("/admin");
}

export async function adminLinkStripeAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const customerId = String(formData.get("stripeCustomerId") || "").trim();
  await mutateStore((data) => {
    const org = data.organizations.find((o) => o.id === organizationId);
    if (!org) return;
    org.stripeCustomerId = customerId;
    data.auditLogs.push({
      id: randomUUID(),
      actorId: admin.id,
      action: "link_stripe",
      organizationId,
      detail: customerId,
      createdAt: iso(),
    });
  });
  if (hasStripe() && customerId) {
    try {
      const customer = await stripeGet(`customers/${customerId}`);
      const subs = customer.subscriptions?.data ?? [];
      const sub = subs[0];
      await mutateStore((data) => {
        const org = data.organizations.find((o) => o.id === organizationId);
        if (!org) return;
        if (sub) {
          org.stripeSubscriptionId = sub.id;
          org.subscriptionStatus = (sub.status as SubscriptionStatus) || org.subscriptionStatus;
        }
      });
    } catch {
      // keep linked id even if Stripe lookup fails
    }
  }
  redirect(`/admin/clinics/${organizationId}/billing?ok=linked`);
}

export async function adminCreateStripeSubAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === organizationId);
  const owner = store.profiles.find((p) => p.organizationId === organizationId && p.role === "clinic_owner");
  const plan = store.plans.find((p) => p.active);
  if (!org || !owner || !plan) redirect(`/admin/clinics/${organizationId}/billing?error=missing`);

  if (!hasStripe()) {
    if (!allowDemoFallbacks()) redirect(`/admin/clinics/${organizationId}/billing?error=nostripe`);
    await mutateStore((data) => {
      const o = data.organizations.find((x) => x.id === organizationId);
      if (o) {
        o.stripeCustomerId = o.stripeCustomerId || `cus_demo_${organizationId.slice(0, 8)}`;
        o.stripeSubscriptionId = `sub_demo_${randomUUID().slice(0, 8)}`;
        o.subscriptionStatus = "active";
      }
      data.auditLogs.push({
        id: randomUUID(),
        actorId: admin.id,
        action: "create_stripe_demo",
        organizationId,
        detail: "Demo customer + subscription (no Stripe key)",
        createdAt: iso(),
      });
    });
    redirect(`/admin/clinics/${organizationId}/billing?ok=demo`);
  }

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const params = new URLSearchParams();
    params.set("email", owner.email);
    params.set("name", org.name);
    params.set("metadata[organization_id]", organizationId);
    const customer = await stripeRequest("customers", params);
    customerId = customer.id;
  }
  const subParams = new URLSearchParams();
  subParams.set("customer", customerId);
  if (plan.stripePriceId) {
    subParams.set("items[0][price]", plan.stripePriceId);
  } else {
    subParams.set("items[0][price_data][currency]", "gbp");
    subParams.set("items[0][price_data][product_data][name]", plan.name);
    subParams.set("items[0][price_data][unit_amount]", String(plan.amountPence));
    subParams.set("items[0][price_data][recurring][interval]", "month");
  }
  const sub = await stripeRequest("subscriptions", subParams);
  await mutateStore((data) => {
    const o = data.organizations.find((x) => x.id === organizationId);
    if (o) {
      o.stripeCustomerId = customerId;
      o.stripeSubscriptionId = sub.id;
      o.subscriptionStatus = (sub.status as SubscriptionStatus) || "active";
    }
  });
  redirect(`/admin/clinics/${organizationId}/billing?ok=created`);
}

export async function adminChargeAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const amountPence = Number(formData.get("amountPence") || 0);
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === organizationId);
  if (!org) redirect("/admin");

  if (!hasStripe()) {
    if (!allowDemoFallbacks()) redirect(`/admin/clinics/${organizationId}/billing?error=nostripe`);
    await mutateStore((data) => {
      data.auditLogs.push({
        id: randomUUID(),
        actorId: admin.id,
        action: "charge_demo",
        organizationId,
        detail: `Demo charge ${amountPence} pence`,
        createdAt: iso(),
      });
    });
    redirect(`/admin/clinics/${organizationId}/billing?ok=charged-demo`);
  }
  if (!org.stripeCustomerId) {
    redirect(`/admin/clinics/${organizationId}/billing?error=nocustomer`);
  }
  const params = new URLSearchParams();
  params.set("customer", org.stripeCustomerId);
  params.set("amount", String(amountPence));
  params.set("currency", "gbp");
  params.set("confirm", "true");
  params.set("off_session", "true");
  params.set("description", `LeadDoc charge for ${org.name}`);
  try {
    await stripeRequest("payment_intents", params);
  } catch (e) {
    const message = e instanceof Error ? e.message : "charge failed";
    redirect(`/admin/clinics/${organizationId}/billing?error=${encodeURIComponent(message)}`);
  }
  await mutateStore((data) => {
    data.auditLogs.push({
      id: randomUUID(),
      actorId: admin.id,
      action: "charge",
      organizationId,
      detail: `${amountPence} pence`,
      createdAt: iso(),
    });
  });
  redirect(`/admin/clinics/${organizationId}/billing?ok=charged`);
}

export async function adminSavePlanAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  await mutateStore((data) => {
    let plan = data.plans.find((p) => p.id === id);
    if (!plan) {
      plan = {
        id: id || randomUUID(),
        name: "Clinic Standard",
        amountPence: 7900,
        interval: "month",
        stripePriceId: "",
        active: true,
      };
      data.plans.push(plan);
    }
    plan.name = String(formData.get("name") || plan.name);
    plan.amountPence = Number(formData.get("amountPence") || plan.amountPence);
    plan.stripePriceId = String(formData.get("stripePriceId") || "");
    plan.active = formData.get("active") === "on";
  });
  redirect("/admin/plans?ok=saved");
}

export async function adminAddSupportNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const body = String(formData.get("body") || "").trim();
  await mutateStore((data) => {
    data.supportNotes.push({
      id: randomUUID(),
      organizationId,
      authorId: admin.id,
      body,
      createdAt: iso(),
    });
  });
  redirect(`/admin/clinics/${organizationId}`);
}

export async function adminToggleWidgetExceptionAction(formData: FormData) {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  await mutateStore((data) => {
    const org = data.organizations.find((o) => o.id === organizationId);
    if (org) org.allowWidgetWithoutSub = !org.allowWidgetWithoutSub;
  });
  redirect(`/admin/clinics/${organizationId}/billing`);
}

export async function adminCreateChatbotAction(formData: FormData) {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const name = String(formData.get("name") || "Chatbot");
  await setImpersonate(organizationId);
  const id = await mutateStore((data) => {
    const botId = randomUUID();
    const org = data.organizations.find((o) => o.id === organizationId);
    data.chatbots.push({
      id: botId,
      organizationId,
      name,
      ...widgetFieldDefaults(org?.name ?? "the practice", org?.primaryColor || "#0f766e"),
      systemPrompt: `You are a helpful receptionist for ${org?.name ?? "the practice"}.`,
      widgetKey: widgetKey(),
      active: true,
      createdAt: iso(),
      setupComplete: true,
      setup: completedSetup({ phone: "", bookingUrl: "" }),
    });
    data.chatbotOptions.push(...defaultTreatments(botId));
    return botId;
  });
  redirect(`/app/chatbots/${id}?from=admin`);
}

export async function adminDeleteChatbotAction(formData: FormData) {
  await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const id = String(formData.get("id") || "");
  await mutateStore((data) => {
    const bot = data.chatbots.find((b) => b.id === id && b.organizationId === organizationId);
    if (!bot) return;
    removeChatbotRecords(data, id);
  });
  redirect(`/admin/clinics/${organizationId}/chatbots?ok=deleted`);
}

function removeOrganizationRecords(data: StoreData, orgId: string) {
  const botIds = data.chatbots.filter((b) => b.organizationId === orgId).map((b) => b.id);
  const convIds = data.conversations.filter((c) => c.organizationId === orgId).map((c) => c.id);
  const leadIds = data.leads.filter((l) => l.organizationId === orgId).map((l) => l.id);
  data.organizations = data.organizations.filter((o) => o.id !== orgId);
  data.profiles = data.profiles.filter((p) => p.organizationId !== orgId);
  data.chatbots = data.chatbots.filter((b) => b.organizationId !== orgId);
  data.chatbotOptions = data.chatbotOptions.filter((o) => !botIds.includes(o.chatbotId));
  data.knowledgeItems = data.knowledgeItems.filter((k) => !botIds.includes(k.chatbotId));
  data.pipelines = data.pipelines.filter((p) => p.organizationId !== orgId);
  data.conversations = data.conversations.filter((c) => c.organizationId !== orgId);
  data.leads = data.leads.filter((l) => l.organizationId !== orgId);
  data.messages = data.messages.filter((m) => !convIds.includes(m.conversationId));
  data.notifications = data.notifications.filter((n) => n.organizationId !== orgId);
  data.leadTasks = (data.leadTasks || []).filter((t) => !leadIds.includes(t.leadId));
  data.leadEvents = (data.leadEvents || []).filter((e) => !leadIds.includes(e.leadId));
  data.leadNotes = (data.leadNotes || []).filter((n) => !leadIds.includes(n.leadId));
  data.leadRecalls = (data.leadRecalls || []).filter((r) => !leadIds.includes(r.leadId));
  data.supportNotes = data.supportNotes.filter((n) => n.organizationId !== orgId);
}

function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return ["inactive", "trialing", "active", "past_due", "canceled"].includes(value);
}

export async function adminSetSubscriptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const status = String(formData.get("subscriptionStatus") || "");
  const allowWidget = formData.get("allowWidgetWithoutSub") === "on";
  await mutateStore((data) => {
    const org = data.organizations.find((o) => o.id === organizationId);
    if (!org || !isSubscriptionStatus(status)) return;
    org.subscriptionStatus = status;
    org.allowWidgetWithoutSub = allowWidget;
    data.auditLogs.push({
      id: randomUUID(),
      actorId: admin.id,
      action: "set_subscription",
      organizationId,
      detail: `${status}; widget exception ${allowWidget ? "on" : "off"}`,
      createdAt: iso(),
    });
  });
  redirect(`/admin/clinics/${organizationId}?ok=access`);
}

export async function adminDeleteClinicAction(formData: FormData) {
  const admin = await requireAdmin();
  const organizationId = String(formData.get("organizationId") || "");
  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== "DELETE") redirect(`/admin/clinics/${organizationId}?error=confirm`);
  await mutateStore((data) => {
    const org = data.organizations.find((o) => o.id === organizationId);
    if (!org) return;
    removeOrganizationRecords(data, organizationId);
    data.auditLogs.push({
      id: randomUUID(),
      actorId: admin.id,
      action: "delete_clinic",
      organizationId: null,
      detail: `Deleted ${org.name} (${organizationId})`,
      createdAt: iso(),
    });
  });
  redirect("/admin?ok=deleted");
}

export async function adminResetUserPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const password = String(formData.get("password") || "");
  if (password.length < 8) redirect("/admin/users?error=short");
  await mutateStore((data) => {
    const user = data.profiles.find((p) => p.id === userId);
    if (!user) return;
    user.passwordHash = hashPassword(password);
    data.auditLogs.push({
      id: randomUUID(),
      actorId: admin.id,
      action: "reset_password",
      organizationId: user.organizationId,
      detail: `Reset password for ${user.email}`,
      createdAt: iso(),
    });
  });
  redirect("/admin/users?ok=reset");
}

export { requireUser };
