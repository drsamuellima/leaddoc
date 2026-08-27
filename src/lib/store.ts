import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hashPassword } from "./crypto";
import { parseActionType, widgetFieldDefaults, type Chatbot, type ChatbotOption, type Organization, type StoreData } from "./types";

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
        phone: "020 7946 0123",
        bookingUrl: "https://brightsmile.dently.app/book",
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
        ...widgetFieldDefaults("Bright Smile Dental", "#e0569f", "Zara"),
        greeting: "Good afternoon, Welcome to Bright Smile Dental 😊",
        greetings: [
          "Good afternoon, Welcome to Bright Smile Dental 😊",
          "I'm Zara, here to help with your enquiry",
          "Which of our services are you interested in?",
        ],
        systemPrompt:
          "You are a friendly receptionist for Bright Smile Dental in the UK. Answer questions about hygiene, whitening, Invisalign, and emergency appointments. Never give clinical diagnoses. Collect enough detail to book a visit and offer to have the team call back.",
        widgetKey: "bright-smile-demo",
        active: true,
        phone: "020 7946 0123",
        bookingUrl: "https://brightsmile.dently.app/book",
        createdAt: now(),
      },
    ],
    chatbotOptions: [
      { id: "opt_1", chatbotId: botId, label: "Book a Consultation", starterMessage: "I'd like to book a consultation.", sortOrder: 0, actionType: "book", url: "" },
      { id: "opt_2", chatbotId: botId, label: "Book an Invisalign Consultation", starterMessage: "I'd like to book an Invisalign consultation.", sortOrder: 1, actionType: "book", url: "" },
      { id: "opt_3", chatbotId: botId, label: "Emergency appointment", starterMessage: "I need an emergency dental appointment.", sortOrder: 2, actionType: "call", url: "" },
      { id: "opt_4", chatbotId: botId, label: "Dental checkup & cleaning", starterMessage: "I'd like a dental checkup and cleaning.", sortOrder: 3, actionType: "lead", url: "" },
      { id: "opt_5", chatbotId: botId, label: "Straighten my teeth", starterMessage: "I'm interested in straightening my teeth.", sortOrder: 4, actionType: "lead", url: "" },
      { id: "opt_6", chatbotId: botId, label: "Replace missing teeth", starterMessage: "I'd like to ask about replacing missing teeth.", sortOrder: 5, actionType: "lead", url: "" },
      { id: "opt_7", chatbotId: botId, label: "Have whiter teeth", starterMessage: "I'm interested in teeth whitening.", sortOrder: 6, actionType: "lead", url: "" },
      { id: "opt_8", chatbotId: botId, label: "Enquire about our treatments", starterMessage: "I'd like to enquire about your treatments.", sortOrder: 7, actionType: "lead", url: "" },
      { id: "opt_9", chatbotId: botId, label: "Facial Aesthetics", starterMessage: "I'm interested in facial aesthetics.", sortOrder: 8, actionType: "lead", url: "" },
      { id: "opt_10", chatbotId: botId, label: "Send a general enquiry", starterMessage: "I have a general enquiry.", sortOrder: 9, actionType: "lead", url: "" },
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

function normalizeStore(data: StoreData): { data: StoreData; changed: boolean } {
  let changed = false;

  for (const org of data.organizations as Organization[]) {
    if (typeof org.phone !== "string") {
      org.phone = "";
      changed = true;
    }
    if (typeof org.bookingUrl !== "string") {
      org.bookingUrl = "";
      changed = true;
    }
  }

  for (const bot of data.chatbots as Chatbot[]) {
    const greetings = Array.isArray(bot.greetings)
      ? bot.greetings.map((g) => String(g || "").trim()).filter(Boolean)
      : [];
    if (!greetings.length && bot.greeting) greetings.push(bot.greeting);
    if (!greetings.length) greetings.push("Welcome. How can we help?");
    if (JSON.stringify(bot.greetings) !== JSON.stringify(greetings) || bot.greeting !== greetings[0]) {
      bot.greetings = greetings;
      bot.greeting = greetings[0];
      changed = true;
    }
    const defaults = widgetFieldDefaults("the practice", "#0f766e");
    const keys = [
      ["accentColor", defaults.accentColor],
      ["panelColor", defaults.panelColor],
      ["buttonTextColor", defaults.buttonTextColor],
      ["avatarName", ""],
      ["avatarImageUrl", ""],
      ["phone", ""],
      ["bookingUrl", ""],
    ] as const;
    for (const [key, fallback] of keys) {
      if (typeof bot[key] !== "string") {
        bot[key] = fallback;
        changed = true;
      }
    }
  }

  for (const opt of data.chatbotOptions as ChatbotOption[]) {
    const actionType = parseActionType(String(opt.actionType || "lead"));
    if (opt.actionType !== actionType) {
      opt.actionType = actionType;
      changed = true;
    }
    if (typeof opt.url !== "string") {
      opt.url = "";
      changed = true;
    }
    if (typeof opt.starterMessage !== "string") {
      opt.starterMessage = opt.label || "";
      changed = true;
    }
  }

  return { data, changed };
}

async function readRaw(): Promise<StoreData> {
  try {
    const raw = await readFile(filePath, "utf8");
    const { data, changed } = normalizeStore(JSON.parse(raw) as StoreData);
    if (changed) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(data, null, 2));
    }
    return data;
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
