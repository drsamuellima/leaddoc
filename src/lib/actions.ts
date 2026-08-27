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
  setSession,
} from "./auth";
import { hashPassword, verifyPassword, widgetKey } from "./crypto";
import { sendLeadEmail } from "./email";
import { appUrl, hasStripe, stripeGet, stripeRequest } from "./integrations";
import { mutateStore, readStore, slugify } from "./store";
import { parseActionType, widgetFieldDefaults, type ChatbotActionType, type SubscriptionStatus } from "./types";
import { isLeadStatus, LEAD_STAGE_LABELS } from "./leads";

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
  const result = await mutateStore((data) => {
    if (data.profiles.some((p) => p.email.toLowerCase() === email)) {
      return { error: "exists" as const };
    }
    const orgId = randomUUID();
    const userId = randomUUID();
    const botId = randomUUID();
    data.organizations.push({
      id: orgId,
      name: clinicName,
      slug: slugify(clinicName) + "-" + orgId.slice(0, 6),
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
      organizationId: orgId,
      role: "clinic_owner",
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: iso(),
    });
    data.chatbots.push({
      id: botId,
      organizationId: orgId,
      name: "Main chatbot",
      ...widgetFieldDefaults(clinicName, "#0f766e"),
      systemPrompt: `You are a helpful receptionist for ${clinicName}, a dental practice.`,
      widgetKey: widgetKey(),
      active: true,
      createdAt: iso(),
    });
    data.chatbotOptions.push(...defaultTreatments(botId));
    return { userId };
  });
  if ("error" in result) redirect("/signup?error=exists");
  await setSession(result.userId);
  redirect("/app");
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

export async function createChatbotAction(formData: FormData) {
  const { org } = await getClinicContext();
  const name = String(formData.get("name") || "New chatbot").trim();
  const id = await mutateStore((data) => {
    const botId = randomUUID();
    data.chatbots.push({
      id: botId,
      organizationId: org.id,
      name,
      ...widgetFieldDefaults(org.name, org.primaryColor),
      systemPrompt: `You are a helpful receptionist for ${org.name}.`,
      widgetKey: widgetKey(),
      active: true,
      createdAt: iso(),
    });
    data.chatbotOptions.push(...defaultTreatments(botId));
    return botId;
  });
  redirect(`/app/chatbots/${id}`);
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
    data.knowledgeItems.push({
      id: randomUUID(),
      chatbotId,
      title: String(formData.get("title") || "FAQ"),
      question: String(formData.get("question") || ""),
      answer: String(formData.get("answer") || ""),
    });
  });
  redirect(`/app/chatbots/${chatbotId}`);
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
  redirect(`/app/chatbots/${chatbotId}`);
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
  const password = String(formData.get("password") || "password");
  await mutateStore((data) => {
    if (data.profiles.some((p) => p.email.toLowerCase() === email)) return;
    data.profiles.push({
      id: randomUUID(),
      organizationId: org.id,
      role: "clinic_staff",
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: iso(),
    });
  });
  redirect("/app/settings?ok=staff");
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
    const nextStatus = String(formData.get("status") || lead.status);
    lead.status = isLeadStatus(nextStatus) ? nextStatus : lead.status;
    lead.assignedTo = String(formData.get("assignedTo") || "") || null;
    lead.followUpAt = String(formData.get("followUpAt") || "") || null;
    lead.notes = String(formData.get("notes") || "");
    if (prevStatus !== lead.status) {
      data.leadEvents.push({
        id: randomUUID(),
        leadId: lead.id,
        body: `${user.name} moved this enquiry to ${LEAD_STAGE_LABELS[lead.status]}.`,
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
  const password = String(formData.get("password") || "password");
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
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
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
  params.set("description", `DentChat charge for ${org.name}`);
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
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
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
    });
    data.chatbotOptions.push(...defaultTreatments(botId));
    return botId;
  });
  redirect(`/app/chatbots/${id}?from=admin`);
}

export { requireUser };
