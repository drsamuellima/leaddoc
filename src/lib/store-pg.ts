import { randomUUID } from "crypto";
import { hashPassword } from "./crypto";
import { getSql, type Tx } from "./db";
import { emptySetup } from "./chatbot-setup";
import { ensureOrgPipelines } from "./pipelines";
import {
  parseActionType,
  parseWidgetFont,
  parseWidgetStyle,
  type AppNotification,
  type AuditLog,
  type Chatbot,
  type ChatbotOption,
  type Conversation,
  type KnowledgeItem,
  type Lead,
  type LeadEvent,
  type LeadNote,
  type LeadRecall,
  type LeadTask,
  type Message,
  type Organization,
  type PasswordResetToken,
  type Plan,
  type Profile,
  type StoreData,
  type SupportNote,
  type TreatmentPipeline,
} from "./types";

const LOCK = 918273645;

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

function isoOrNull(value: unknown): string | null {
  if (!value) return null;
  return iso(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function jsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jsonObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function emptyStore(): StoreData {
  return {
    organizations: [],
    profiles: [],
    plans: [],
    chatbots: [],
    chatbotOptions: [],
    knowledgeItems: [],
    leads: [],
    pipelines: [],
    leadTasks: [],
    leadEvents: [],
    leadNotes: [],
    leadRecalls: [],
    conversations: [],
    messages: [],
    notifications: [],
    supportNotes: [],
    auditLogs: [],
    passwordResetTokens: [],
  };
}

function mapOrg(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: str(row.name),
    slug: str(row.slug),
    logoUrl: str(row.logo_url),
    primaryColor: str(row.primary_color, "#0f766e"),
    welcomeImageUrl: str(row.welcome_image_url),
    phone: str(row.phone),
    bookingUrl: str(row.booking_url),
    stripeCustomerId: str(row.stripe_customer_id),
    stripeSubscriptionId: str(row.stripe_subscription_id),
    subscriptionStatus: (str(row.subscription_status, "inactive") as Organization["subscriptionStatus"]),
    allowWidgetWithoutSub: Boolean(row.allow_widget_without_sub),
    createdAt: iso(row.created_at),
  };
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    organizationId: row.organization_id ? String(row.organization_id) : null,
    role: str(row.role, "clinic_owner") as Profile["role"],
    name: str(row.name),
    email: str(row.email),
    passwordHash: str(row.password_hash),
    createdAt: iso(row.created_at),
  };
}

function mapPlan(row: Record<string, unknown>): Plan {
  return {
    id: String(row.id),
    name: str(row.name),
    amountPence: Number(row.amount_pence || 0),
    interval: "month",
    stripePriceId: str(row.stripe_price_id),
    active: Boolean(row.active),
  };
}

function mapBot(row: Record<string, unknown>): Chatbot {
  const greetings = jsonArray<string>(row.greetings).map((g) => String(g || "").trim()).filter(Boolean);
  const greeting = greetings[0] || str(row.greeting, "Welcome. How can we help?");
  if (!greetings.length) greetings.push(greeting);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: str(row.name),
    greeting,
    greetings,
    systemPrompt: str(row.system_prompt),
    widgetKey: str(row.widget_key),
    active: Boolean(row.active),
    accentColor: str(row.accent_color),
    panelColor: str(row.panel_color, "#ffffff"),
    buttonTextColor: str(row.button_text_color, "#1a1a1a"),
    widgetStyle: parseWidgetStyle(str(row.widget_style, "orbital")),
    fontFamily: parseWidgetFont(str(row.font_family, "system")),
    surfaceColor: str(row.surface_color, "#f4f4f0"),
    userBubbleColor: str(row.user_bubble_color),
    assistantBubbleColor: str(row.assistant_bubble_color, "#f3f4f6"),
    launcherColor: str(row.launcher_color),
    avatarName: str(row.avatar_name),
    avatarImageUrl: str(row.avatar_image_url),
    phone: str(row.phone),
    bookingUrl: str(row.booking_url),
    createdAt: iso(row.created_at),
    setupComplete: Boolean(row.setup_complete),
    setup: jsonObject(row.setup, emptySetup()),
  };
}

function mapOption(row: Record<string, unknown>): ChatbotOption {
  return {
    id: String(row.id),
    chatbotId: String(row.chatbot_id),
    label: str(row.label),
    starterMessage: str(row.starter_message),
    sortOrder: Number(row.sort_order || 0),
    actionType: parseActionType(str(row.action_type, "lead")),
    url: str(row.url),
  };
}

function mapKnowledge(row: Record<string, unknown>): KnowledgeItem {
  return {
    id: String(row.id),
    chatbotId: String(row.chatbot_id),
    title: str(row.title),
    question: str(row.question),
    answer: str(row.answer),
  };
}

function mapPipeline(row: Record<string, unknown>): TreatmentPipeline {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: str(row.name),
    stages: jsonArray(row.stages),
    createdAt: iso(row.created_at),
  };
}

function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    chatbotId: String(row.chatbot_id),
    leadId: row.lead_id ? String(row.lead_id) : null,
    createdAt: iso(row.created_at),
  };
}

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    chatbotId: String(row.chatbot_id),
    conversationId: String(row.conversation_id),
    name: str(row.name),
    email: str(row.email),
    phone: str(row.phone),
    inquiry: str(row.inquiry),
    status: str(row.status, "new") as Lead["status"],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    followUpAt: isoOrNull(row.follow_up_at),
    notes: str(row.notes),
    treatment: str(row.treatment),
    pipelineId: row.pipeline_id ? String(row.pipeline_id) : null,
    stageId: row.stage_id ? String(row.stage_id) : null,
    amountPence: row.amount_pence == null ? null : Number(row.amount_pence),
    createdAt: iso(row.created_at),
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: str(row.role, "user") as Message["role"],
    content: str(row.content),
    createdAt: iso(row.created_at),
  };
}

function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    type: "new_lead",
    title: str(row.title),
    body: str(row.body),
    leadId: str(row.lead_id),
    readAt: isoOrNull(row.read_at),
    createdAt: iso(row.created_at),
  };
}

function mapTask(row: Record<string, unknown>): LeadTask {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    title: str(row.title),
    body: str(row.body),
    dueAt: isoOrNull(row.due_at),
    important: Boolean(row.important),
    completedAt: isoOrNull(row.completed_at),
    createdBy: str(row.created_by),
    createdAt: iso(row.created_at),
  };
}

function mapEvent(row: Record<string, unknown>): LeadEvent {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    body: str(row.body),
    createdAt: iso(row.created_at),
  };
}

function mapNote(row: Record<string, unknown>): LeadNote {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    body: str(row.body),
    authorId: String(row.author_id),
    createdAt: iso(row.created_at),
  };
}

function mapRecall(row: Record<string, unknown>): LeadRecall {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    dueAt: iso(row.due_at),
    reason: str(row.reason),
    completedAt: isoOrNull(row.completed_at),
    createdBy: str(row.created_by),
    createdAt: iso(row.created_at),
  };
}

function mapSupport(row: Record<string, unknown>): SupportNote {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    authorId: str(row.author_id),
    body: str(row.body),
    createdAt: iso(row.created_at),
  };
}

function mapAudit(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    actorId: str(row.actor_id),
    action: str(row.action),
    organizationId: row.organization_id ? String(row.organization_id) : null,
    detail: str(row.detail),
    createdAt: iso(row.created_at),
  };
}

function mapReset(row: Record<string, unknown>): PasswordResetToken {
  return {
    id: String(row.id),
    email: str(row.email),
    tokenHash: str(row.token_hash),
    expiresAt: iso(row.expires_at),
  };
}

async function load(tx: Tx): Promise<StoreData> {
  // Sequential on purpose: Supabase transaction pooler + postgres.js max:1
  // hangs if many queries are pipelined at once (Vercel then kills /admin).
  const organizations = await tx`select * from organizations`;
  const profiles = await tx`select * from profiles`;
  const plans = await tx`select * from plans`;
  const chatbots = await tx`select * from chatbots`;
  const chatbotOptions = await tx`select * from chatbot_options`;
  const knowledgeItems = await tx`select * from knowledge_items`;
  const pipelines = await tx`select * from pipelines`;
  const conversations = await tx`select * from conversations`;
  const leads = await tx`select * from leads`;
  const messages = await tx`select * from messages`;
  const notifications = await tx`select * from notifications`;
  const leadTasks = await tx`select * from lead_tasks`;
  const leadEvents = await tx`select * from lead_events`;
  const leadNotes = await tx`select * from lead_notes`;
  const leadRecalls = await tx`select * from lead_recalls`;
  const supportNotes = await tx`select * from support_notes`;
  const auditLogs = await tx`select * from audit_logs`;
  const passwordResetTokens = await tx`select * from password_reset_tokens`;

  const data = emptyStore();
  data.organizations = organizations.map((row: Record<string, unknown>) => mapOrg(row));
  data.profiles = profiles.map((row: Record<string, unknown>) => mapProfile(row));
  data.plans = plans.map((row: Record<string, unknown>) => mapPlan(row));
  data.chatbots = chatbots.map((row: Record<string, unknown>) => mapBot(row));
  data.chatbotOptions = chatbotOptions.map((row: Record<string, unknown>) => mapOption(row));
  data.knowledgeItems = knowledgeItems.map((row: Record<string, unknown>) => mapKnowledge(row));
  data.pipelines = pipelines.map((row: Record<string, unknown>) => mapPipeline(row));
  data.conversations = conversations.map((row: Record<string, unknown>) => mapConversation(row));
  data.leads = leads.map((row: Record<string, unknown>) => mapLead(row));
  data.messages = messages.map((row: Record<string, unknown>) => mapMessage(row));
  data.notifications = notifications.map((row: Record<string, unknown>) => mapNotification(row));
  data.leadTasks = leadTasks.map((row: Record<string, unknown>) => mapTask(row));
  data.leadEvents = leadEvents.map((row: Record<string, unknown>) => mapEvent(row));
  data.leadNotes = leadNotes.map((row: Record<string, unknown>) => mapNote(row));
  data.leadRecalls = leadRecalls.map((row: Record<string, unknown>) => mapRecall(row));
  data.supportNotes = supportNotes.map((row: Record<string, unknown>) => mapSupport(row));
  data.auditLogs = auditLogs.map((row: Record<string, unknown>) => mapAudit(row));
  data.passwordResetTokens = passwordResetTokens.map((row: Record<string, unknown>) => mapReset(row));
  return data;
}

function applyBootstrap(data: StoreData) {
  if (!Array.isArray(data.passwordResetTokens)) data.passwordResetTokens = [];
  const priceId = (process.env.STRIPE_PRICE_ID || "").trim();
  if (!data.plans.length) {
    data.plans.push({
      id: randomUUID(),
      name: "Clinic Standard",
      amountPence: 7900,
      interval: "month",
      stripePriceId: priceId,
      active: true,
    });
  } else if (priceId) {
    const plan = data.plans.find((p) => p.active) || data.plans[0];
    if (plan && !plan.stripePriceId) plan.stripePriceId = priceId;
  }

  const email = (process.env.ADMIN_EMAIL || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim().replace(/^['"]|['"]$/g, "");
  if (email && password && !data.profiles.some((p) => p.email.toLowerCase() === email)) {
    data.profiles.push({
      id: randomUUID(),
      organizationId: null,
      role: "super_admin",
      name: "Platform Admin",
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    });
  }
  ensureOrgPipelines(data);
}

function uuidOrNull(value: string | null | undefined) {
  return value ? value : null;
}

async function deleteMissing(tx: Tx, table: string, ids: string[]) {
  if (ids.length) {
    await tx`delete from ${tx(table)} where not (id = any(${ids}::uuid[]))`;
    return;
  }
  await tx`delete from ${tx(table)}`;
}

async function persist(tx: Tx, data: StoreData) {
  await deleteMissing(tx, "password_reset_tokens", data.passwordResetTokens.map((r) => r.id));
  await deleteMissing(tx, "lead_recalls", data.leadRecalls.map((r) => r.id));
  await deleteMissing(tx, "lead_notes", data.leadNotes.map((r) => r.id));
  await deleteMissing(tx, "lead_events", data.leadEvents.map((r) => r.id));
  await deleteMissing(tx, "lead_tasks", data.leadTasks.map((r) => r.id));
  await deleteMissing(tx, "notifications", data.notifications.map((r) => r.id));
  await deleteMissing(tx, "messages", data.messages.map((r) => r.id));
  await deleteMissing(tx, "knowledge_items", data.knowledgeItems.map((r) => r.id));
  await deleteMissing(tx, "chatbot_options", data.chatbotOptions.map((r) => r.id));
  await deleteMissing(tx, "leads", data.leads.map((r) => r.id));
  await deleteMissing(tx, "conversations", data.conversations.map((r) => r.id));
  await deleteMissing(tx, "pipelines", data.pipelines.map((r) => r.id));
  await deleteMissing(tx, "chatbots", data.chatbots.map((r) => r.id));
  await deleteMissing(tx, "support_notes", data.supportNotes.map((r) => r.id));
  await deleteMissing(tx, "audit_logs", data.auditLogs.map((r) => r.id));
  await deleteMissing(tx, "profiles", data.profiles.map((r) => r.id));
  await deleteMissing(tx, "plans", data.plans.map((r) => r.id));
  await deleteMissing(tx, "organizations", data.organizations.map((r) => r.id));

  for (const o of data.organizations) {
    await tx`
      insert into organizations as t (
        id, name, slug, logo_url, primary_color, welcome_image_url, phone, booking_url,
        stripe_customer_id, stripe_subscription_id, subscription_status, allow_widget_without_sub, created_at
      ) values (
        ${o.id}::uuid, ${o.name}, ${o.slug}, ${o.logoUrl}, ${o.primaryColor}, ${o.welcomeImageUrl},
        ${o.phone}, ${o.bookingUrl}, ${o.stripeCustomerId}, ${o.stripeSubscriptionId},
        ${o.subscriptionStatus}, ${o.allowWidgetWithoutSub}, ${o.createdAt}
      )
      on conflict (id) do update set
        name = excluded.name, slug = excluded.slug, logo_url = excluded.logo_url,
        primary_color = excluded.primary_color, welcome_image_url = excluded.welcome_image_url,
        phone = excluded.phone, booking_url = excluded.booking_url,
        stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id,
        subscription_status = excluded.subscription_status, allow_widget_without_sub = excluded.allow_widget_without_sub
    `;
  }

  for (const p of data.profiles) {
    await tx`
      insert into profiles as t (id, organization_id, role, name, email, password_hash, created_at)
      values (
        ${p.id}::uuid, ${uuidOrNull(p.organizationId)}::uuid, ${p.role}, ${p.name}, ${p.email}, ${p.passwordHash}, ${p.createdAt}
      )
      on conflict (id) do update set
        organization_id = excluded.organization_id, role = excluded.role, name = excluded.name,
        email = excluded.email, password_hash = excluded.password_hash
    `;
  }

  for (const p of data.plans) {
    await tx`
      insert into plans as t (id, name, amount_pence, interval, stripe_price_id, active)
      values (${p.id}::uuid, ${p.name}, ${p.amountPence}, ${p.interval}, ${p.stripePriceId}, ${p.active})
      on conflict (id) do update set
        name = excluded.name, amount_pence = excluded.amount_pence, interval = excluded.interval,
        stripe_price_id = excluded.stripe_price_id, active = excluded.active
    `;
  }

  for (const b of data.chatbots) {
    await tx`
      insert into chatbots as t (
        id, organization_id, name, greeting, greetings, system_prompt, widget_key, active,
        accent_color, panel_color, button_text_color, widget_style, font_family, surface_color,
        user_bubble_color, assistant_bubble_color, launcher_color, avatar_name, avatar_image_url,
        phone, booking_url, setup_complete, setup, created_at
      ) values (
        ${b.id}::uuid, ${b.organizationId}::uuid, ${b.name}, ${b.greeting}, ${tx.json(b.greetings)},
        ${b.systemPrompt}, ${b.widgetKey}, ${b.active}, ${b.accentColor}, ${b.panelColor},
        ${b.buttonTextColor}, ${b.widgetStyle}, ${b.fontFamily}, ${b.surfaceColor},
        ${b.userBubbleColor}, ${b.assistantBubbleColor}, ${b.launcherColor}, ${b.avatarName},
        ${b.avatarImageUrl}, ${b.phone}, ${b.bookingUrl}, ${b.setupComplete}, ${tx.json(b.setup)}, ${b.createdAt}
      )
      on conflict (id) do update set
        name = excluded.name, greeting = excluded.greeting, greetings = excluded.greetings,
        system_prompt = excluded.system_prompt, widget_key = excluded.widget_key, active = excluded.active,
        accent_color = excluded.accent_color, panel_color = excluded.panel_color,
        button_text_color = excluded.button_text_color, widget_style = excluded.widget_style,
        font_family = excluded.font_family, surface_color = excluded.surface_color,
        user_bubble_color = excluded.user_bubble_color, assistant_bubble_color = excluded.assistant_bubble_color,
        launcher_color = excluded.launcher_color, avatar_name = excluded.avatar_name,
        avatar_image_url = excluded.avatar_image_url, phone = excluded.phone, booking_url = excluded.booking_url,
        setup_complete = excluded.setup_complete, setup = excluded.setup
    `;
  }

  for (const o of data.chatbotOptions) {
    await tx`
      insert into chatbot_options as t (id, chatbot_id, label, starter_message, sort_order, action_type, url)
      values (${o.id}::uuid, ${o.chatbotId}::uuid, ${o.label}, ${o.starterMessage}, ${o.sortOrder}, ${o.actionType}, ${o.url})
      on conflict (id) do update set
        label = excluded.label, starter_message = excluded.starter_message, sort_order = excluded.sort_order,
        action_type = excluded.action_type, url = excluded.url
    `;
  }

  for (const k of data.knowledgeItems) {
    await tx`
      insert into knowledge_items as t (id, chatbot_id, title, question, answer)
      values (${k.id}::uuid, ${k.chatbotId}::uuid, ${k.title}, ${k.question}, ${k.answer})
      on conflict (id) do update set title = excluded.title, question = excluded.question, answer = excluded.answer
    `;
  }

  for (const p of data.pipelines) {
    await tx`
      insert into pipelines as t (id, organization_id, name, stages, created_at)
      values (${p.id}::uuid, ${p.organizationId}::uuid, ${p.name}, ${tx.json(p.stages)}, ${p.createdAt})
      on conflict (id) do update set name = excluded.name, stages = excluded.stages
    `;
  }

  for (const c of data.conversations) {
    await tx`
      insert into conversations as t (id, organization_id, chatbot_id, lead_id, created_at)
        values (${c.id}::uuid, ${c.organizationId}::uuid, ${c.chatbotId}::uuid, ${uuidOrNull(c.leadId)}::uuid, ${c.createdAt})
      on conflict (id) do update set lead_id = excluded.lead_id
    `;
  }

  for (const l of data.leads) {
    await tx`
      insert into leads as t (
        id, organization_id, chatbot_id, conversation_id, name, email, phone, inquiry, status,
        assigned_to, follow_up_at, notes, treatment, pipeline_id, stage_id, amount_pence, created_at
      ) values (
        ${l.id}::uuid, ${l.organizationId}::uuid, ${l.chatbotId}::uuid, ${l.conversationId}::uuid,
        ${l.name}, ${l.email}, ${l.phone}, ${l.inquiry}, ${l.status}, ${uuidOrNull(l.assignedTo)}::uuid,
        ${l.followUpAt}, ${l.notes}, ${l.treatment}, ${uuidOrNull(l.pipelineId)}::uuid, ${l.stageId}, ${l.amountPence}, ${l.createdAt}
      )
      on conflict (id) do update set
        name = excluded.name, email = excluded.email, phone = excluded.phone, inquiry = excluded.inquiry,
        status = excluded.status, assigned_to = excluded.assigned_to, follow_up_at = excluded.follow_up_at,
        notes = excluded.notes, treatment = excluded.treatment, pipeline_id = excluded.pipeline_id,
        stage_id = excluded.stage_id, amount_pence = excluded.amount_pence
    `;
  }

  for (const m of data.messages) {
    await tx`
      insert into messages as t (id, conversation_id, role, content, created_at)
      values (${m.id}::uuid, ${m.conversationId}::uuid, ${m.role}, ${m.content}, ${m.createdAt})
      on conflict (id) do update set role = excluded.role, content = excluded.content
    `;
  }

  for (const n of data.notifications) {
    await tx`
      insert into notifications as t (id, organization_id, type, title, body, lead_id, read_at, created_at)
      values (
        ${n.id}::uuid, ${n.organizationId}::uuid, ${n.type}, ${n.title}, ${n.body}, ${uuidOrNull(n.leadId)}::uuid, ${n.readAt}, ${n.createdAt}
      )
      on conflict (id) do update set title = excluded.title, body = excluded.body, read_at = excluded.read_at
    `;
  }

  for (const t of data.leadTasks) {
    await tx`
      insert into lead_tasks as l (id, lead_id, title, body, due_at, important, completed_at, created_by, created_at)
      values (
        ${t.id}::uuid, ${t.leadId}::uuid, ${t.title}, ${t.body}, ${t.dueAt}, ${t.important}, ${t.completedAt}, ${uuidOrNull(t.createdBy)}::uuid, ${t.createdAt}
      )
      on conflict (id) do update set
        title = excluded.title, body = excluded.body, due_at = excluded.due_at, important = excluded.important,
        completed_at = excluded.completed_at
    `;
  }

  for (const e of data.leadEvents) {
    await tx`
      insert into lead_events as t (id, lead_id, body, created_at)
      values (${e.id}::uuid, ${e.leadId}::uuid, ${e.body}, ${e.createdAt})
      on conflict (id) do update set body = excluded.body
    `;
  }

  for (const n of data.leadNotes) {
    await tx`
      insert into lead_notes as t (id, lead_id, body, author_id, created_at)
      values (${n.id}::uuid, ${n.leadId}::uuid, ${n.body}, ${n.authorId}::uuid, ${n.createdAt})
      on conflict (id) do update set body = excluded.body
    `;
  }

  for (const r of data.leadRecalls) {
    await tx`
      insert into lead_recalls as t (id, lead_id, due_at, reason, completed_at, created_by, created_at)
      values (${r.id}::uuid, ${r.leadId}::uuid, ${r.dueAt}, ${r.reason}, ${r.completedAt}, ${uuidOrNull(r.createdBy)}::uuid, ${r.createdAt})
      on conflict (id) do update set due_at = excluded.due_at, reason = excluded.reason, completed_at = excluded.completed_at
    `;
  }

  for (const n of data.supportNotes) {
    await tx`
      insert into support_notes as t (id, organization_id, author_id, body, created_at)
      values (${n.id}::uuid, ${n.organizationId}::uuid, ${uuidOrNull(n.authorId)}::uuid, ${n.body}, ${n.createdAt})
      on conflict (id) do update set body = excluded.body
    `;
  }

  for (const a of data.auditLogs) {
    await tx`
      insert into audit_logs as t (id, actor_id, action, organization_id, detail, created_at)
      values (${a.id}::uuid, ${uuidOrNull(a.actorId)}::uuid, ${a.action}, ${uuidOrNull(a.organizationId)}::uuid, ${a.detail}, ${a.createdAt})
      on conflict (id) do update set action = excluded.action, detail = excluded.detail
    `;
  }

  for (const r of data.passwordResetTokens) {
    await tx`
      insert into password_reset_tokens as t (id, email, token_hash, expires_at)
      values (${r.id}::uuid, ${r.email}, ${r.tokenHash}, ${r.expiresAt})
      on conflict (id) do update set email = excluded.email, token_hash = excluded.token_hash, expires_at = excluded.expires_at
    `;
  }
}

let bootstrapped = false;

async function ensureBootstrap() {
  const sql = getSql();
  const priceId = (process.env.STRIPE_PRICE_ID || "").trim();
  const plans = await sql`select id, stripe_price_id, active from plans`;
  if (!plans.length) {
    await sql`
      insert into plans (id, name, amount_pence, interval, stripe_price_id, active)
      values (${randomUUID()}::uuid, 'Clinic Standard', 7900, 'month', ${priceId}, true)
    `;
  } else if (priceId) {
    const plan = plans.find((p) => p.active) || plans[0];
    if (plan && !String(plan.stripe_price_id || "")) {
      await sql`update plans set stripe_price_id = ${priceId} where id = ${String(plan.id)}::uuid`;
    }
  }

  const email = (process.env.ADMIN_EMAIL || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim().replace(/^['"]|['"]$/g, "");
  if (email && password) {
    const existing = await sql`select id from profiles where lower(email) = ${email} limit 1`;
    if (!existing.length) {
      await sql`
        insert into profiles (id, organization_id, role, name, email, password_hash, created_at)
        values (
          ${randomUUID()}::uuid, null, 'super_admin', 'Platform Admin', ${email},
          ${hashPassword(password)}, ${new Date().toISOString()}
        )
      `;
    }
  }
}

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function getPgProfileById(id: string) {
  if (!isUuid(id)) return null;
  const rows = await getSql()`select * from profiles where id = ${id}::uuid limit 1`;
  return rows[0] ? mapProfile(rows[0] as Record<string, unknown>) : null;
}

export async function getPgOrganizationById(id: string) {
  if (!isUuid(id)) return null;
  const rows = await getSql()`select * from organizations where id = ${id}::uuid limit 1`;
  return rows[0] ? mapOrg(rows[0] as Record<string, unknown>) : null;
}

export async function getPgAdminDirectory() {
  await ensureBootstrap();
  const sql = getSql();
  const organizations = (await sql`select * from organizations order by name`).map((row) =>
    mapOrg(row as Record<string, unknown>),
  );
  const leadRows = await sql`
    select organization_id, count(*)::int as n from leads group by organization_id
  `;
  const profileCountRows = await sql`select count(*)::int as n from profiles`;
  const leadCountRows = await sql`select count(*)::int as n from leads`;
  const leadCountByOrg: Record<string, number> = {};
  for (const row of leadRows) {
    leadCountByOrg[String(row.organization_id)] = Number(row.n || 0);
  }
  return {
    organizations,
    profileCount: Number(profileCountRows[0]?.n || 0),
    leadCount: Number(leadCountRows[0]?.n || 0),
    leadCountByOrg,
  };
}

export async function readPgStore(): Promise<StoreData> {
  if (!bootstrapped) {
    await ensureBootstrap();
    bootstrapped = true;
  }
  return load(getSql());
}

export async function mutatePgStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  return getSql().begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK})`;
    const data = await load(tx);
    applyBootstrap(data);
    const result = await fn(data);
    await persist(tx, data);
    bootstrapped = true;
    return result;
  }) as Promise<T>;
}
