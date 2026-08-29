import { randomUUID } from "crypto";
import { hashPassword } from "./crypto";
import { getSql, type Tx } from "./db";
import { emptySetup } from "./chatbot-setup";
import { applyPipelineToLead, ensureOrgPipelines, matchPipeline, stageIdForStatus } from "./pipelines";
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

function mapRows<T>(value: unknown, map: (row: Record<string, unknown>) => T): T[] {
  return jsonArray<Record<string, unknown>>(value).map(map);
}

async function load(tx: Tx): Promise<StoreData> {
  const [row] = await tx`
    select
      (select coalesce(json_agg(t), '[]'::json) from organizations t) as organizations,
      (select coalesce(json_agg(t), '[]'::json) from profiles t) as profiles,
      (select coalesce(json_agg(t), '[]'::json) from plans t) as plans,
      (select coalesce(json_agg(t), '[]'::json) from chatbots t) as chatbots,
      (select coalesce(json_agg(t), '[]'::json) from chatbot_options t) as chatbot_options,
      (select coalesce(json_agg(t), '[]'::json) from knowledge_items t) as knowledge_items,
      (select coalesce(json_agg(t), '[]'::json) from pipelines t) as pipelines,
      (select coalesce(json_agg(t), '[]'::json) from conversations t) as conversations,
      (select coalesce(json_agg(t), '[]'::json) from leads t) as leads,
      (select coalesce(json_agg(t), '[]'::json) from messages t) as messages,
      (select coalesce(json_agg(t), '[]'::json) from notifications t) as notifications,
      (select coalesce(json_agg(t), '[]'::json) from lead_tasks t) as lead_tasks,
      (select coalesce(json_agg(t), '[]'::json) from lead_events t) as lead_events,
      (select coalesce(json_agg(t), '[]'::json) from lead_notes t) as lead_notes,
      (select coalesce(json_agg(t), '[]'::json) from lead_recalls t) as lead_recalls,
      (select coalesce(json_agg(t), '[]'::json) from support_notes t) as support_notes,
      (select coalesce(json_agg(t), '[]'::json) from audit_logs t) as audit_logs,
      (select coalesce(json_agg(t), '[]'::json) from password_reset_tokens t) as password_reset_tokens
  `;
  const data = emptyStore();
  data.organizations = mapRows(row.organizations, mapOrg);
  data.profiles = mapRows(row.profiles, mapProfile);
  data.plans = mapRows(row.plans, mapPlan);
  data.chatbots = mapRows(row.chatbots, mapBot);
  data.chatbotOptions = mapRows(row.chatbot_options, mapOption);
  data.knowledgeItems = mapRows(row.knowledge_items, mapKnowledge);
  data.pipelines = mapRows(row.pipelines, mapPipeline);
  data.conversations = mapRows(row.conversations, mapConversation);
  data.leads = mapRows(row.leads, mapLead);
  data.messages = mapRows(row.messages, mapMessage);
  data.notifications = mapRows(row.notifications, mapNotification);
  data.leadTasks = mapRows(row.lead_tasks, mapTask);
  data.leadEvents = mapRows(row.lead_events, mapEvent);
  data.leadNotes = mapRows(row.lead_notes, mapNote);
  data.leadRecalls = mapRows(row.lead_recalls, mapRecall);
  data.supportNotes = mapRows(row.support_notes, mapSupport);
  data.auditLogs = mapRows(row.audit_logs, mapAudit);
  data.passwordResetTokens = mapRows(row.password_reset_tokens, mapReset);
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

export async function getPgAdminLeads() {
  await ensureBootstrap();
  const sql = getSql();
  const rows = await sql`
    select l.*, o.name as clinic_name
    from leads l
    left join organizations o on o.id = l.organization_id
    order by l.created_at desc
    limit 500
  `;
  return rows.map((row) => ({
    ...mapLead(row as Record<string, unknown>),
    clinicName: str(row.clinic_name, "Unknown clinic"),
  }));
}

export async function getPgAdminUsers() {
  await ensureBootstrap();
  const sql = getSql();
  const rows = await sql`
    select p.*, o.name as clinic_name
    from profiles p
    left join organizations o on o.id = p.organization_id
    order by p.email
  `;
  return rows.map((row) => ({
    ...mapProfile(row as Record<string, unknown>),
    clinicName: row.organization_id ? str(row.clinic_name, "—") : "Platform",
  }));
}

export async function getPgAdminAudit() {
  await ensureBootstrap();
  const sql = getSql();
  const rows = await sql`
    select a.*, p.email as actor_email, o.name as clinic_name
    from audit_logs a
    left join profiles p on p.id = a.actor_id
    left join organizations o on o.id = a.organization_id
    order by a.created_at desc
    limit 200
  `;
  return rows.map((row) => ({
    ...mapAudit(row as Record<string, unknown>),
    actorEmail: str(row.actor_email, "system"),
    clinicName: row.organization_id ? str(row.clinic_name, String(row.organization_id)) : "—",
  }));
}

export async function getPgPlans() {
  await ensureBootstrap();
  const sql = getSql();
  const rows = await sql`select * from plans order by name`;
  return rows.map((row) => mapPlan(row as Record<string, unknown>));
}

export async function appendPgAudit(entry: AuditLog) {
  await ensureBootstrap();
  const sql = getSql();
  await sql`
    insert into audit_logs (id, actor_id, action, organization_id, detail, created_at)
    values (
      ${entry.id}::uuid, ${uuidOrNull(entry.actorId)}::uuid, ${entry.action},
      ${uuidOrNull(entry.organizationId)}::uuid, ${entry.detail}, ${entry.createdAt}
    )
  `;
}

export async function savePgOrganization(org: Organization) {
  if (!isUuid(org.id)) return;
  await ensureBootstrap();
  const sql = getSql();
  await sql`
    update organizations set
      name = ${org.name},
      slug = ${org.slug},
      logo_url = ${org.logoUrl},
      primary_color = ${org.primaryColor},
      welcome_image_url = ${org.welcomeImageUrl},
      phone = ${org.phone},
      booking_url = ${org.bookingUrl},
      stripe_customer_id = ${org.stripeCustomerId},
      stripe_subscription_id = ${org.stripeSubscriptionId},
      subscription_status = ${org.subscriptionStatus},
      allow_widget_without_sub = ${org.allowWidgetWithoutSub}
    where id = ${org.id}::uuid
  `;
}

export async function insertPgChatbot(bot: Chatbot, options: ChatbotOption[]) {
  if (!isUuid(bot.id) || !isUuid(bot.organizationId)) return;
  await ensureBootstrap();
  const sql = getSql();
  await sql.begin(async (tx) => {
    await persistChatbot(tx, bot);
    await persistBotChildren(tx, bot.id, options, []);
  });
}

export async function deletePgChatbot(orgId: string, botId: string) {
  if (!isUuid(orgId) || !isUuid(botId)) return;
  await ensureBootstrap();
  const sql = getSql();
  await sql.begin(async (tx) => {
    const owned = await tx`select id from chatbots where id = ${botId}::uuid and organization_id = ${orgId}::uuid`;
    if (!owned.length) return;
    await tx`delete from chatbot_options where chatbot_id = ${botId}::uuid`;
    await tx`delete from knowledge_items where chatbot_id = ${botId}::uuid`;
    await tx`delete from chatbots where id = ${botId}::uuid`;
  });
}

export async function insertPgProfile(profile: Profile) {
  await ensureBootstrap();
  const sql = getSql();
  await sql`
    insert into profiles (id, organization_id, role, name, email, password_hash, created_at)
    values (
      ${profile.id}::uuid, ${uuidOrNull(profile.organizationId)}::uuid, ${profile.role},
      ${profile.name}, ${profile.email}, ${profile.passwordHash}, ${profile.createdAt}
    )
  `;
}

export async function emailTakenPg(email: string) {
  await ensureBootstrap();
  const sql = getSql();
  const rows = await sql`select id from profiles where lower(email) = ${email} limit 1`;
  return rows.length > 0;
}

export async function savePgPlan(plan: Plan) {
  await ensureBootstrap();
  const sql = getSql();
  await sql`
    insert into plans as t (id, name, amount_pence, interval, stripe_price_id, active)
    values (${plan.id}::uuid, ${plan.name}, ${plan.amountPence}, ${plan.interval}, ${plan.stripePriceId}, ${plan.active})
    on conflict (id) do update set
      name = excluded.name, amount_pence = excluded.amount_pence, interval = excluded.interval,
      stripe_price_id = excluded.stripe_price_id, active = excluded.active
  `;
}

export async function insertPgSupportNote(note: SupportNote) {
  await ensureBootstrap();
  const sql = getSql();
  await sql`
    insert into support_notes (id, organization_id, author_id, body, created_at)
    values (${note.id}::uuid, ${note.organizationId}::uuid, ${uuidOrNull(note.authorId)}::uuid, ${note.body}, ${note.createdAt})
  `;
}

export async function setPgPassword(userId: string, passwordHash: string) {
  if (!isUuid(userId)) return;
  await ensureBootstrap();
  await getSql()`update profiles set password_hash = ${passwordHash} where id = ${userId}::uuid`;
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

async function persistChatbot(tx: Tx, b: Chatbot) {
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

async function persistBotChildren(tx: Tx, botId: string, options: ChatbotOption[], faqs: KnowledgeItem[]) {
  await tx`delete from chatbot_options where chatbot_id = ${botId}::uuid`;
  await tx`delete from knowledge_items where chatbot_id = ${botId}::uuid`;
  for (const o of options) {
    await tx`
      insert into chatbot_options (id, chatbot_id, label, starter_message, sort_order, action_type, url)
      values (${o.id}::uuid, ${o.chatbotId}::uuid, ${o.label}, ${o.starterMessage}, ${o.sortOrder}, ${o.actionType}, ${o.url})
    `;
  }
  for (const k of faqs) {
    await tx`
      insert into knowledge_items (id, chatbot_id, title, question, answer)
      values (${k.id}::uuid, ${k.chatbotId}::uuid, ${k.title}, ${k.question}, ${k.answer})
    `;
  }
}

export async function createClinicSignupPg(input: {
  email: string;
  org: Organization;
  user: Profile;
  bot: Chatbot;
  pipeline: TreatmentPipeline;
}): Promise<{ userId: string; botId: string; orgId: string } | { error: "exists" }> {
  await ensureBootstrap();
  const sql = getSql();
  const existing = await sql`select id from profiles where lower(email) = ${input.email} limit 1`;
  if (existing.length) return { error: "exists" };
  const o = input.org;
  const p = input.user;
  const pipe = input.pipeline;
  try {
    await sql.begin(async (tx) => {
      await tx`
        insert into organizations (
          id, name, slug, logo_url, primary_color, welcome_image_url, phone, booking_url,
          stripe_customer_id, stripe_subscription_id, subscription_status, allow_widget_without_sub, created_at
        ) values (
          ${o.id}::uuid, ${o.name}, ${o.slug}, ${o.logoUrl}, ${o.primaryColor}, ${o.welcomeImageUrl},
          ${o.phone}, ${o.bookingUrl}, ${o.stripeCustomerId}, ${o.stripeSubscriptionId},
          ${o.subscriptionStatus}, ${o.allowWidgetWithoutSub}, ${o.createdAt}
        )
      `;
      await tx`
        insert into profiles (id, organization_id, role, name, email, password_hash, created_at)
        values (
          ${p.id}::uuid, ${p.organizationId}::uuid, ${p.role}, ${p.name}, ${p.email}, ${p.passwordHash}, ${p.createdAt}
        )
      `;
      await persistChatbot(tx, input.bot);
      await tx`
        insert into pipelines (id, organization_id, name, stages, created_at)
        values (${pipe.id}::uuid, ${pipe.organizationId}::uuid, ${pipe.name}, ${tx.json(pipe.stages)}, ${pipe.createdAt})
      `;
    });
    bootstrapped = true;
    return { userId: p.id, botId: input.bot.id, orgId: o.id };
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "23505") return { error: "exists" };
    throw err;
  }
}

export type ClinicSlice =
  | "overview"
  | "chatbots"
  | "studio"
  | "leads"
  | "pipelines"
  | "conversations"
  | "settings"
  | "full";

function storeFromAgg(row: Record<string, unknown>): StoreData {
  const data = emptyStore();
  data.organizations = mapRows(row.organizations, mapOrg);
  data.profiles = mapRows(row.profiles, mapProfile);
  data.plans = mapRows(row.plans, mapPlan);
  data.chatbots = mapRows(row.chatbots, mapBot);
  data.chatbotOptions = mapRows(row.chatbot_options, mapOption);
  data.knowledgeItems = mapRows(row.knowledge_items, mapKnowledge);
  data.pipelines = mapRows(row.pipelines, mapPipeline);
  data.conversations = mapRows(row.conversations, mapConversation);
  data.leads = mapRows(row.leads, mapLead);
  data.messages = mapRows(row.messages, mapMessage);
  data.notifications = mapRows(row.notifications, mapNotification);
  data.leadTasks = mapRows(row.lead_tasks, mapTask);
  data.leadEvents = mapRows(row.lead_events, mapEvent);
  data.leadNotes = mapRows(row.lead_notes, mapNote);
  data.leadRecalls = mapRows(row.lead_recalls, mapRecall);
  data.supportNotes = mapRows(row.support_notes, mapSupport);
  return data;
}

export async function getPgClinicUnreadCount(orgId: string): Promise<number> {
  if (!isUuid(orgId)) return 0;
  const [row] = await getSql()`
    select count(*)::int as n
    from notifications
    where organization_id = ${orgId}::uuid and read_at is null
  `;
  return Number(row?.n ?? 0);
}

export async function readPgClinicStore(orgId: string, _slice: ClinicSlice = "full"): Promise<StoreData> {
  if (!isUuid(orgId)) return emptyStore();
  if (!bootstrapped) {
    await ensureBootstrap();
    bootstrapped = true;
  }
  const sql = getSql();
  const [row] = await sql`
    select
      (select coalesce(json_agg(t), '[]'::json) from organizations t where t.id = ${orgId}::uuid) as organizations,
      (select coalesce(json_agg(t), '[]'::json) from profiles t where t.organization_id = ${orgId}::uuid) as profiles,
      (select coalesce(json_agg(t), '[]'::json) from plans t) as plans,
      (select coalesce(json_agg(t), '[]'::json) from chatbots t where t.organization_id = ${orgId}::uuid) as chatbots,
      (select coalesce(json_agg(t), '[]'::json) from chatbot_options t
        where t.chatbot_id in (select id from chatbots where organization_id = ${orgId}::uuid)) as chatbot_options,
      (select coalesce(json_agg(t), '[]'::json) from knowledge_items t
        where t.chatbot_id in (select id from chatbots where organization_id = ${orgId}::uuid)) as knowledge_items,
      (select coalesce(json_agg(t), '[]'::json) from pipelines t where t.organization_id = ${orgId}::uuid) as pipelines,
      (select coalesce(json_agg(t), '[]'::json) from conversations t where t.organization_id = ${orgId}::uuid) as conversations,
      (select coalesce(json_agg(t), '[]'::json) from leads t where t.organization_id = ${orgId}::uuid) as leads,
      (select coalesce(json_agg(t), '[]'::json) from messages t
        where t.conversation_id in (select id from conversations where organization_id = ${orgId}::uuid)) as messages,
      (select coalesce(json_agg(t), '[]'::json) from notifications t where t.organization_id = ${orgId}::uuid) as notifications,
      (select coalesce(json_agg(t), '[]'::json) from lead_tasks t
        where t.lead_id in (select id from leads where organization_id = ${orgId}::uuid)) as lead_tasks,
      (select coalesce(json_agg(t), '[]'::json) from lead_events t
        where t.lead_id in (select id from leads where organization_id = ${orgId}::uuid)) as lead_events,
      (select coalesce(json_agg(t), '[]'::json) from lead_notes t
        where t.lead_id in (select id from leads where organization_id = ${orgId}::uuid)) as lead_notes,
      (select coalesce(json_agg(t), '[]'::json) from lead_recalls t
        where t.lead_id in (select id from leads where organization_id = ${orgId}::uuid)) as lead_recalls,
      (select coalesce(json_agg(t), '[]'::json) from support_notes t where t.organization_id = ${orgId}::uuid) as support_notes
  `;
  return storeFromAgg(row as Record<string, unknown>);
}

export async function readPgClinicLead(orgId: string, leadId: string): Promise<StoreData | null> {
  if (!isUuid(orgId) || !isUuid(leadId)) return null;
  const sql = getSql();
  const [row] = await sql`
    select
      (select coalesce(json_agg(t), '[]'::json) from organizations t where t.id = ${orgId}::uuid) as organizations,
      (select coalesce(json_agg(t), '[]'::json) from profiles t where t.organization_id = ${orgId}::uuid) as profiles,
      (select coalesce(json_agg(t), '[]'::json) from chatbots t where t.organization_id = ${orgId}::uuid) as chatbots,
      (select coalesce(json_agg(t), '[]'::json) from pipelines t where t.organization_id = ${orgId}::uuid) as pipelines,
      (select coalesce(json_agg(t), '[]'::json) from leads t
        where t.id = ${leadId}::uuid and t.organization_id = ${orgId}::uuid) as leads,
      (select coalesce(json_agg(t), '[]'::json) from conversations t
        where t.id = (select conversation_id from leads where id = ${leadId}::uuid)) as conversations,
      (select coalesce(json_agg(t), '[]'::json) from messages t
        where t.conversation_id = (select conversation_id from leads where id = ${leadId}::uuid)) as messages,
      (select coalesce(json_agg(t), '[]'::json) from lead_tasks t where t.lead_id = ${leadId}::uuid) as lead_tasks,
      (select coalesce(json_agg(t), '[]'::json) from lead_events t where t.lead_id = ${leadId}::uuid) as lead_events,
      (select coalesce(json_agg(t), '[]'::json) from lead_notes t where t.lead_id = ${leadId}::uuid) as lead_notes,
      (select coalesce(json_agg(t), '[]'::json) from lead_recalls t where t.lead_id = ${leadId}::uuid) as lead_recalls
  `;
  const data = storeFromAgg(row as Record<string, unknown>);
  return data.leads[0] ? data : null;
}

export async function readPgClinicConversation(orgId: string, conversationId: string): Promise<StoreData | null> {
  if (!isUuid(orgId) || !isUuid(conversationId)) return null;
  const sql = getSql();
  const [row] = await sql`
    select
      (select coalesce(json_agg(t), '[]'::json) from organizations t where t.id = ${orgId}::uuid) as organizations,
      (select coalesce(json_agg(t), '[]'::json) from conversations t
        where t.id = ${conversationId}::uuid and t.organization_id = ${orgId}::uuid) as conversations,
      (select coalesce(json_agg(t), '[]'::json) from leads t
        where t.conversation_id = ${conversationId}::uuid and t.organization_id = ${orgId}::uuid) as leads,
      (select coalesce(json_agg(t), '[]'::json) from messages t
        where t.conversation_id = ${conversationId}::uuid) as messages
  `;
  const data = storeFromAgg(row as Record<string, unknown>);
  return data.conversations[0] ? data : null;
}

export async function getPgOwnedChatbot(botId: string, orgId: string) {
  if (!isUuid(botId) || !isUuid(orgId)) return null;
  const rows = await getSql()`
    select * from chatbots where id = ${botId}::uuid and organization_id = ${orgId}::uuid limit 1
  `;
  return rows[0] ? mapBot(rows[0] as Record<string, unknown>) : null;
}

export async function getPgWidgetByKey(widgetKey: string) {
  const sql = getSql();
  const botRows = await sql`select * from chatbots where widget_key = ${widgetKey} limit 1`;
  if (!botRows.length) return null;
  const bot = mapBot(botRows[0] as Record<string, unknown>);
  const orgRows = await sql`select * from organizations where id = ${bot.organizationId}::uuid limit 1`;
  if (!orgRows.length) return null;
  return { org: mapOrg(orgRows[0] as Record<string, unknown>), bot };
}

export async function getPgChatbotOptions(botId: string) {
  if (!isUuid(botId)) return [];
  return (await getSql()`select * from chatbot_options where chatbot_id = ${botId}::uuid order by sort_order`).map((row) =>
    mapOption(row as Record<string, unknown>),
  );
}

export async function getPgKnowledgeForBot(botId: string) {
  if (!isUuid(botId)) return [];
  return (await getSql()`select * from knowledge_items where chatbot_id = ${botId}::uuid`).map((row) =>
    mapKnowledge(row as Record<string, unknown>),
  );
}

export async function getPgChatHistory(orgId: string, conversationId: string) {
  if (!isUuid(orgId) || !isUuid(conversationId)) return null;
  const sql = getSql();
  const conv = await sql`
    select id from conversations
    where id = ${conversationId}::uuid and organization_id = ${orgId}::uuid
    limit 1
  `;
  if (!conv.length) return null;
  const messages = (await sql`
    select * from messages where conversation_id = ${conversationId}::uuid order by created_at
  `).map((row) => mapMessage(row as Record<string, unknown>));
  return messages;
}

export async function appendPgChatTurn(conversationId: string, userContent: string, reply: string) {
  const sql = getSql();
  const at = new Date().toISOString();
  await sql`
    insert into messages (id, conversation_id, role, content, created_at)
    values (${randomUUID()}::uuid, ${conversationId}::uuid, 'user', ${userContent}, ${at})
  `;
  await sql`
    insert into messages (id, conversation_id, role, content, created_at)
    values (${randomUUID()}::uuid, ${conversationId}::uuid, 'assistant', ${reply}, ${at})
  `;
}

export async function getPgClinicNotifyEmail(orgId: string) {
  if (!isUuid(orgId)) return "";
  const rows = await getSql()`
    select email from profiles
    where organization_id = ${orgId}::uuid and role in ('clinic_owner', 'clinic_staff')
    order by role
    limit 1
  `;
  return str(rows[0]?.email);
}

export async function createPgWidgetLead(input: {
  orgId: string;
  botId: string;
  name: string;
  email: string;
  phone: string;
  inquiry: string;
  reply: string;
}) {
  const sql = getSql();
  const conversationId = randomUUID();
  const leadId = randomUUID();
  const at = new Date().toISOString();
  const pipelines = (await sql`select * from pipelines where organization_id = ${input.orgId}::uuid`).map((row) =>
    mapPipeline(row as Record<string, unknown>),
  );
  const pipeline = matchPipeline(input.inquiry, pipelines);
  const leadRecord = {
    id: leadId,
    organizationId: input.orgId,
    chatbotId: input.botId,
    conversationId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    inquiry: input.inquiry,
    status: "new" as const,
    assignedTo: null as string | null,
    followUpAt: null as string | null,
    notes: "",
    treatment: pipeline?.name || "",
    pipelineId: pipeline?.id || null,
    stageId: pipeline ? stageIdForStatus(pipeline, "new") : null,
    amountPence: null as number | null,
    createdAt: at,
  };
  if (pipeline) applyPipelineToLead(leadRecord, pipeline, stageIdForStatus(pipeline, "new"));
  await sql.begin(async (tx) => {
    await tx`
      insert into conversations (id, organization_id, chatbot_id, lead_id, created_at)
      values (${conversationId}::uuid, ${input.orgId}::uuid, ${input.botId}::uuid, ${leadId}::uuid, ${at})
    `;
    await tx`
      insert into leads (
        id, organization_id, chatbot_id, conversation_id, name, email, phone, inquiry, status,
        assigned_to, follow_up_at, notes, treatment, pipeline_id, stage_id, amount_pence, created_at
      ) values (
        ${leadId}::uuid, ${input.orgId}::uuid, ${input.botId}::uuid, ${conversationId}::uuid,
        ${leadRecord.name}, ${leadRecord.email}, ${leadRecord.phone}, ${leadRecord.inquiry}, ${leadRecord.status},
        ${uuidOrNull(leadRecord.assignedTo)}::uuid, ${leadRecord.followUpAt}, ${leadRecord.notes}, ${leadRecord.treatment},
        ${uuidOrNull(leadRecord.pipelineId)}::uuid, ${leadRecord.stageId}, ${leadRecord.amountPence}, ${leadRecord.createdAt}
      )
    `;
    await tx`
      insert into messages (id, conversation_id, role, content, created_at)
      values (${randomUUID()}::uuid, ${conversationId}::uuid, 'user', ${input.inquiry}, ${at})
    `;
    await tx`
      insert into messages (id, conversation_id, role, content, created_at)
      values (${randomUUID()}::uuid, ${conversationId}::uuid, 'assistant', ${input.reply}, ${at})
    `;
    await tx`
      insert into notifications (id, organization_id, type, title, body, lead_id, read_at, created_at)
      values (
        ${randomUUID()}::uuid, ${input.orgId}::uuid, 'new_lead', ${`New lead: ${input.name}`}, ${input.inquiry},
        ${leadId}::uuid, null, ${at}
      )
    `;
    await tx`
      insert into lead_events (id, lead_id, body, created_at)
      values (${randomUUID()}::uuid, ${leadId}::uuid, 'Enquiry captured from the website widget.', ${at})
    `;
  });
  return { conversationId, leadId, reply: input.reply };
}

export async function mutateOwnedBotPg<T>(
  orgId: string,
  botId: string,
  fn: (data: StoreData, bot: Chatbot) => T | Promise<T>,
): Promise<T | null> {
  if (!isUuid(orgId) || !isUuid(botId)) return null;
  return getSql().begin(async (tx) => {
    const botRows = await tx`select * from chatbots where id = ${botId}::uuid and organization_id = ${orgId}::uuid limit 1`;
    if (!botRows.length) return null;
    const bot = mapBot(botRows[0] as Record<string, unknown>);
    const options = (await tx`select * from chatbot_options where chatbot_id = ${botId}::uuid`).map((row) =>
      mapOption(row as Record<string, unknown>),
    );
    const faqs = (await tx`select * from knowledge_items where chatbot_id = ${botId}::uuid`).map((row) =>
      mapKnowledge(row as Record<string, unknown>),
    );
    const data = emptyStore();
    data.chatbots = [bot];
    data.chatbotOptions = options;
    data.knowledgeItems = faqs;
    const result = await fn(data, bot);
    const saved = data.chatbots.find((row) => row.id === botId) || bot;
    await persistChatbot(tx, saved);
    await persistBotChildren(
      tx,
      botId,
      data.chatbotOptions.filter((o) => o.chatbotId === botId),
      data.knowledgeItems.filter((k) => k.chatbotId === botId),
    );
    return result;
  }) as Promise<T | null>;
}
