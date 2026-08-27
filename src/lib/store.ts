import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hashPassword, widgetKey } from "./crypto";
import type { StoreData } from "./types";

const filePath = path.join(process.cwd(), ".data", "store.json");

let queue: Promise<unknown> = Promise.resolve();

function now() {
  return new Date().toISOString();
}

function seed(): StoreData {
  const orgId = "org_demo";
  const ownerId = "user_clinic";
  const adminId = "user_admin";
  const botId = "bot_demo";
  const convId = "conv_demo";
  const leadId = "lead_demo";
  const passwordHash = hashPassword("password");

  return {
    organizations: [
      {
        id: orgId,
        name: "Bright Smile Dental",
        slug: "bright-smile",
        logoUrl: "",
        primaryColor: "#0f766e",
        welcomeImageUrl: "",
        stripeCustomerId: "",
        stripeSubscriptionId: "",
        subscriptionStatus: "active",
        allowWidgetWithoutSub: false,
        createdAt: now(),
      },
    ],
    profiles: [
      {
        id: adminId,
        organizationId: null,
        role: "super_admin",
        name: "Platform Admin",
        email: "admin@dentchat.local",
        passwordHash,
        createdAt: now(),
      },
      {
        id: ownerId,
        organizationId: orgId,
        role: "clinic_owner",
        name: "Dr. Sarah Chen",
        email: "clinic@dentchat.local",
        passwordHash,
        createdAt: now(),
      },
      {
        id: "user_staff",
        organizationId: orgId,
        role: "clinic_staff",
        name: "Alex Patel",
        email: "staff@dentchat.local",
        passwordHash,
        createdAt: now(),
      },
    ],
    plans: [
      {
        id: "plan_standard",
        name: "Clinic Standard",
        amountPence: 7900,
        interval: "month",
        stripePriceId: "",
        active: true,
      },
    ],
    chatbots: [
      {
        id: botId,
        organizationId: orgId,
        name: "New patient assistant",
        greeting: "Welcome to Bright Smile Dental. How can we help today?",
        systemPrompt:
          "You are a friendly receptionist for Bright Smile Dental in the UK. Answer questions about hygiene, whitening, Invisalign, and emergency appointments. Never give clinical diagnoses. Collect enough detail to book a visit and offer to have the team call back.",
        widgetKey: widgetKey(),
        active: true,
        createdAt: now(),
      },
    ],
    chatbotOptions: [
      { id: "opt_1", chatbotId: botId, label: "Book a check-up", starterMessage: "I'd like to book a dental check-up.", sortOrder: 0 },
      { id: "opt_2", chatbotId: botId, label: "Tooth pain", starterMessage: "I have tooth pain and need advice on what to do.", sortOrder: 1 },
      { id: "opt_3", chatbotId: botId, label: "Teeth whitening", starterMessage: "I'm interested in teeth whitening.", sortOrder: 2 },
    ],
    knowledgeItems: [
      {
        id: "kb_1",
        chatbotId: botId,
        title: "Hours",
        question: "What are your opening hours?",
        answer: "Monday–Friday 8:00–18:00, Saturday 9:00–13:00. Closed Sunday. Emergencies: call the practice number on the website.",
      },
      {
        id: "kb_2",
        chatbotId: botId,
        title: "New patients",
        question: "Do you accept new NHS or private patients?",
        answer: "We currently accept new private patients. NHS availability is limited — leave your details and the team will confirm.",
      },
    ],
    conversations: [
      {
        id: convId,
        organizationId: orgId,
        chatbotId: botId,
        leadId,
        createdAt: now(),
      },
    ],
    leads: [
      {
        id: leadId,
        organizationId: orgId,
        chatbotId: botId,
        conversationId: convId,
        name: "Jamie Wright",
        email: "jamie@example.com",
        phone: "07700 900123",
        inquiry: "I'd like to book a dental check-up.",
        status: "new",
        assignedTo: ownerId,
        followUpAt: null,
        notes: "Came in via website widget.",
        createdAt: now(),
      },
    ],
    messages: [
      {
        id: "msg_1",
        conversationId: convId,
        role: "user",
        content: "I'd like to book a dental check-up.",
        createdAt: now(),
      },
      {
        id: "msg_2",
        conversationId: convId,
        role: "assistant",
        content: "Of course — we have private check-ups Monday to Saturday. The team will call you on 07700 900123 to confirm a time.",
        createdAt: now(),
      },
    ],
    notifications: [
      {
        id: "nt_1",
        organizationId: orgId,
        type: "new_lead",
        title: "New lead: Jamie Wright",
        body: "I'd like to book a dental check-up.",
        leadId,
        readAt: null,
        createdAt: now(),
      },
    ],
    supportNotes: [],
    auditLogs: [],
  };
}

async function readRaw(): Promise<StoreData> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const data = seed();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2));
    return data;
  }
}

export async function readStore(): Promise<StoreData> {
  return readRaw();
}

export async function mutateStore<T>(fn: (data: StoreData) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const data = await readRaw();
    const result = await fn(data);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2));
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "clinic"
  );
}
