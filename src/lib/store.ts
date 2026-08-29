import { cache } from "react";
import { useJsonStore } from "./config";
import { mutateJsonStore, readJsonStore, slugify, DEMO_WIDGET_KEY } from "./store-json";
import {
  appendPgChatTurn,
  createPgWidgetLead,
  getPgAdminDirectory,
  getPgChatbotOptions,
  getPgChatHistory,
  getPgClinicNotifyEmail,
  getPgKnowledgeForBot,
  getPgOwnedChatbot,
  getPgOrganizationById,
  getPgProfileById,
  getPgWidgetByKey,
  mutateOwnedBotPg,
  mutatePgStore,
  readPgClinicStore,
  readPgStore,
} from "./store-pg";
import { applyPipelineToLead, matchPipeline, stageIdForStatus } from "./pipelines";
import type { Chatbot, ChatbotOption, KnowledgeItem, Message, Organization, Profile, StoreData } from "./types";
import { randomUUID } from "crypto";

export { slugify, DEMO_WIDGET_KEY };

export async function readStore(): Promise<StoreData> {
  if (useJsonStore()) return readJsonStore();
  return readPgStore();
}

export async function mutateStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  if (useJsonStore()) return mutateJsonStore(fn);
  return mutatePgStore(fn);
}

export const getProfileById = cache(async (id: string): Promise<Profile | null> => {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.profiles.find((p) => p.id === id) ?? null;
  }
  return getPgProfileById(id);
});

export const getOrganizationById = cache(async (id: string): Promise<Organization | null> => {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.organizations.find((o) => o.id === id) ?? null;
  }
  return getPgOrganizationById(id);
});

function filterStoreByOrg(store: StoreData, orgId: string): StoreData {
  const chatbots = store.chatbots.filter((b) => b.organizationId === orgId);
  const botIds = new Set(chatbots.map((b) => b.id));
  const conversations = store.conversations.filter((c) => c.organizationId === orgId);
  const convIds = new Set(conversations.map((c) => c.id));
  const leads = store.leads.filter((l) => l.organizationId === orgId);
  const leadIds = new Set(leads.map((l) => l.id));
  return {
    ...store,
    organizations: store.organizations.filter((o) => o.id === orgId),
    profiles: store.profiles.filter((p) => p.organizationId === orgId),
    chatbots,
    chatbotOptions: store.chatbotOptions.filter((o) => botIds.has(o.chatbotId)),
    knowledgeItems: store.knowledgeItems.filter((k) => botIds.has(k.chatbotId)),
    pipelines: store.pipelines.filter((p) => p.organizationId === orgId),
    conversations,
    leads,
    messages: store.messages.filter((m) => convIds.has(m.conversationId)),
    notifications: store.notifications.filter((n) => n.organizationId === orgId),
    leadTasks: store.leadTasks.filter((t) => leadIds.has(t.leadId)),
    leadEvents: store.leadEvents.filter((e) => leadIds.has(e.leadId)),
    leadNotes: store.leadNotes.filter((n) => leadIds.has(n.leadId)),
    leadRecalls: store.leadRecalls.filter((r) => leadIds.has(r.leadId)),
    supportNotes: store.supportNotes.filter((n) => n.organizationId === orgId),
    auditLogs: store.auditLogs.filter((a) => a.organizationId === orgId),
    passwordResetTokens: [],
  };
}

export const readClinicStore = cache(async (orgId: string): Promise<StoreData> => {
  if (useJsonStore()) return filterStoreByOrg(await readJsonStore(), orgId);
  return readPgClinicStore(orgId);
});

export async function mutateOwnedChatbot<T>(
  orgId: string,
  botId: string,
  fn: (data: StoreData, bot: Chatbot) => T | Promise<T>,
): Promise<T | null> {
  if (useJsonStore()) {
    return mutateJsonStore((data) => {
      const bot = data.chatbots.find((b) => b.id === botId && b.organizationId === orgId);
      if (!bot) return null;
      return fn(data, bot);
    });
  }
  return mutateOwnedBotPg(orgId, botId, fn);
}

export async function getAdminDirectory() {
  if (useJsonStore()) {
    const store = await readJsonStore();
    const leadCountByOrg: Record<string, number> = {};
    for (const lead of store.leads) {
      leadCountByOrg[lead.organizationId] = (leadCountByOrg[lead.organizationId] || 0) + 1;
    }
    return {
      organizations: store.organizations,
      profileCount: store.profiles.length,
      leadCount: store.leads.length,
      leadCountByOrg,
    };
  }
  return getPgAdminDirectory();
}

export async function getOwnedChatbot(botId: string, orgId: string) {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.chatbots.find((b) => b.id === botId && b.organizationId === orgId) ?? null;
  }
  return getPgOwnedChatbot(botId, orgId);
}

export async function findWidget(widgetKey: string) {
  if (useJsonStore()) {
    const store = await readJsonStore();
    const bot = store.chatbots.find((b) => b.widgetKey === widgetKey);
    if (!bot) return null;
    const org = store.organizations.find((o) => o.id === bot.organizationId);
    if (!org) return null;
    return { org, bot };
  }
  return getPgWidgetByKey(widgetKey);
}

export async function listChatbotOptions(botId: string): Promise<ChatbotOption[]> {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.chatbotOptions.filter((o) => o.chatbotId === botId).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return getPgChatbotOptions(botId);
}

export async function listBotKnowledge(botId: string): Promise<KnowledgeItem[]> {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return store.knowledgeItems.filter((k) => k.chatbotId === botId);
  }
  return getPgKnowledgeForBot(botId);
}

export async function listConversationMessages(orgId: string, conversationId: string): Promise<Message[] | null> {
  if (useJsonStore()) {
    const store = await readJsonStore();
    const conversation = store.conversations.find((c) => c.id === conversationId && c.organizationId === orgId);
    if (!conversation) return null;
    return store.messages.filter((m) => m.conversationId === conversationId);
  }
  return getPgChatHistory(orgId, conversationId);
}

export async function appendChatTurn(conversationId: string, userContent: string, reply: string) {
  if (useJsonStore()) {
    await mutateJsonStore((data) => {
      const at = new Date().toISOString();
      data.messages.push(
        { id: randomUUID(), conversationId, role: "user", content: userContent, createdAt: at },
        { id: randomUUID(), conversationId, role: "assistant", content: reply, createdAt: at },
      );
    });
    return;
  }
  await appendPgChatTurn(conversationId, userContent, reply);
}

export async function clinicNotifyEmail(orgId: string) {
  if (useJsonStore()) {
    const store = await readJsonStore();
    return (
      store.profiles.find((p) => p.organizationId === orgId && (p.role === "clinic_owner" || p.role === "clinic_staff"))
        ?.email || ""
    );
  }
  return getPgClinicNotifyEmail(orgId);
}

export async function createWidgetLead(input: {
  orgId: string;
  botId: string;
  name: string;
  email: string;
  phone: string;
  inquiry: string;
  reply: string;
}) {
  if (useJsonStore()) {
    return mutateJsonStore((data) => {
      const conversationId = randomUUID();
      const leadId = randomUUID();
      const at = new Date().toISOString();
      data.conversations.push({
        id: conversationId,
        organizationId: input.orgId,
        chatbotId: input.botId,
        leadId,
        createdAt: at,
      });
      const orgPipes = data.pipelines.filter((p) => p.organizationId === input.orgId);
      const pipeline = matchPipeline(input.inquiry, orgPipes);
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
        { id: randomUUID(), conversationId, role: "user", content: input.inquiry, createdAt: at },
        { id: randomUUID(), conversationId, role: "assistant", content: input.reply, createdAt: at },
      );
      data.notifications.push({
        id: randomUUID(),
        organizationId: input.orgId,
        type: "new_lead",
        title: `New lead: ${input.name}`,
        body: input.inquiry,
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
      return { conversationId, leadId, reply: input.reply };
    });
  }
  return createPgWidgetLead(input);
}
