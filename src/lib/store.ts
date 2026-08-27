import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hashPassword } from "./crypto";
import {
  parseActionType,
  widgetFieldDefaults,
  type Chatbot,
  type ChatbotOption,
  type Conversation,
  type Lead,
  type LeadEvent,
  type LeadTask,
  type Message,
  type Organization,
  type StoreData,
} from "./types";

const filePath = path.join(process.cwd(), ".data", "store.json");
export const DEMO_WIDGET_KEY = "bright-smile-demo";

let queue: Promise<unknown> = Promise.resolve();

function now() {
  return new Date().toISOString();
}

function daysAgo(days: number, hours = 9, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

type ClinicDemoCrm = {
  leads: Lead[];
  conversations: Conversation[];
  messages: Message[];
  leadTasks: LeadTask[];
  leadEvents: LeadEvent[];
};

function clinicDemoCrm(orgId: string, botId: string, ownerId: string, staffId: string): ClinicDemoCrm {
  const rows: {
    id: string;
    name: string;
    email: string;
    phone: string;
    inquiry: string;
    status: Lead["status"];
    assignedTo: string | null;
    followUpAt: string | null;
    notes: string;
    createdAt: string;
    reply: string;
  }[] = [
    {
      id: "lead_priya",
      name: "Priya Nair",
      email: "priya.nair@example.com",
      phone: "07700 900231",
      inquiry: "I'd like to book an Invisalign consultation.",
      status: "contacted",
      assignedTo: ownerId,
      followUpAt: daysAgo(-2, 11, 0),
      notes: "Prefers evenings after 6pm. Asked about monthly payment plans.",
      createdAt: daysAgo(6, 10, 12),
      reply: "We can arrange a private Invisalign consult. A clinician will call you to talk through scans and pricing.",
    },
    {
      id: "lead_tom",
      name: "Tom Hughes",
      email: "tom.hughes@example.com",
      phone: "07700 900442",
      inquiry: "I need an emergency dental appointment — cracked a molar last night.",
      status: "booked",
      assignedTo: staffId,
      followUpAt: daysAgo(-1, 8, 30),
      notes: "Emergency slot booked for tomorrow morning.",
      createdAt: daysAgo(1, 21, 4),
      reply: "Sorry you're in pain. Please call the practice if swelling increases. We'll hold an emergency slot and confirm shortly.",
    },
    {
      id: "lead_eleanor",
      name: "Eleanor Pena",
      email: "eleanor.pena@example.com",
      phone: "07700 900118",
      inquiry: "I'm interested in teeth whitening before a wedding.",
      status: "contacted",
      assignedTo: staffId,
      followUpAt: daysAgo(-5, 14, 0),
      notes: "Wedding in six weeks. Sent whitening aftercare leaflet.",
      createdAt: daysAgo(9, 15, 40),
      reply: "We offer in-chair and take-home whitening. We'll check your enamel first at a short consult.",
    },
    {
      id: "lead_jenny",
      name: "Jenny Wilson",
      email: "jenny.wilson@example.com",
      phone: "07700 900773",
      inquiry: "I'd like to ask about replacing missing teeth.",
      status: "new",
      assignedTo: null,
      followUpAt: null,
      notes: "",
      createdAt: daysAgo(0, 8, 20),
      reply: "We can talk through bridges and implants. Leave this with the team and we'll be in touch to book an assessment.",
    },
    {
      id: "lead_ronald",
      name: "Ronald Richards",
      email: "ronald.richards@example.com",
      phone: "07700 900556",
      inquiry: "I'd like a dental checkup and cleaning.",
      status: "booked",
      assignedTo: ownerId,
      followUpAt: daysAgo(-3, 9, 0),
      notes: "New patient exam + scale and polish booked.",
      createdAt: daysAgo(12, 9, 5),
      reply: "Of course — we have private check-ups Monday to Saturday. The team will confirm a time on this number.",
    },
    {
      id: "lead_maya",
      name: "Maya Okonkwo",
      email: "maya.okonkwo@example.com",
      phone: "07700 900664",
      inquiry: "I'm interested in facial aesthetics.",
      status: "closed",
      assignedTo: ownerId,
      followUpAt: null,
      notes: "Booked elsewhere. Happy to return for dentistry.",
      createdAt: daysAgo(20, 13, 10),
      reply: "Our facial aesthetics clinics run on Thursdays. I can take your details for a nurse-led consult.",
    },
    {
      id: "lead_oliver",
      name: "Oliver Grant",
      email: "oliver.grant@example.com",
      phone: "07700 900801",
      inquiry: "I'm interested in straightening my teeth.",
      status: "new",
      assignedTo: staffId,
      followUpAt: daysAgo(-1, 16, 0),
      notes: "Compare Invisalign vs fixed braces.",
      createdAt: daysAgo(2, 18, 45),
      reply: "We offer Invisalign and fixed options. A short scan appointment is the usual next step.",
    },
    {
      id: "lead_sophie",
      name: "Sophie Walsh",
      email: "sophie.walsh@example.com",
      phone: "07700 900219",
      inquiry: "Do you accept new private patients for a family checkup?",
      status: "contacted",
      assignedTo: staffId,
      followUpAt: daysAgo(-4, 10, 0),
      notes: "Two children, ages 7 and 11. Asked about Saturday mornings.",
      createdAt: daysAgo(4, 11, 22),
      reply: "Yes — we are taking new private patients. Saturday mornings are popular for families; we'll confirm availability.",
    },
    {
      id: "lead_daniel",
      name: "Daniel Kim",
      email: "daniel.kim@example.com",
      phone: "07700 900390",
      inquiry: "I'd like to book a consultation.",
      status: "booked",
      assignedTo: ownerId,
      followUpAt: daysAgo(-7, 15, 30),
      notes: "New patient consult in the diary.",
      createdAt: daysAgo(8, 16, 2),
      reply: "We can book a new patient consultation. Someone from reception will confirm the time with you.",
    },
  ];

  const leads: Lead[] = [];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const leadEvents: LeadEvent[] = [];

  for (const row of rows) {
    const conversationId = `conv_${row.id.slice(5)}`;
    leads.push({
      id: row.id,
      organizationId: orgId,
      chatbotId: botId,
      conversationId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      inquiry: row.inquiry,
      status: row.status,
      assignedTo: row.assignedTo,
      followUpAt: row.followUpAt,
      notes: row.notes,
      createdAt: row.createdAt,
    });
    conversations.push({
      id: conversationId,
      organizationId: orgId,
      chatbotId: botId,
      leadId: row.id,
      createdAt: row.createdAt,
    });
    messages.push(
      {
        id: `msg_${row.id}_u`,
        conversationId,
        role: "user",
        content: row.inquiry,
        createdAt: row.createdAt,
      },
      {
        id: `msg_${row.id}_a`,
        conversationId,
        role: "assistant",
        content: row.reply,
        createdAt: daysAgo(
          Math.max(0, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 86400000)),
          new Date(row.createdAt).getHours(),
          new Date(row.createdAt).getMinutes() + 1,
        ),
      },
    );
    leadEvents.push({
      id: `evt_${row.id}_new`,
      leadId: row.id,
      body: "Enquiry captured from the website widget.",
      createdAt: row.createdAt,
    });
    if (row.status !== "new") {
      leadEvents.push({
        id: `evt_${row.id}_stage`,
        leadId: row.id,
        body:
          row.status === "contacted"
            ? "Reception marked this enquiry as contacted."
            : row.status === "booked"
              ? "Appointment booked in the practice diary."
              : "Enquiry closed.",
        createdAt: daysAgo(Math.max(0, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 86400000) - 1), 12, 0),
      });
    }
  }

  const leadTasks: LeadTask[] = [
    {
      id: "task_jamie_call",
      leadId: "lead_demo",
      title: "Call to confirm check-up",
      body: "Offer a weekday morning or Saturday slot. Confirm they are a new private patient.",
      dueAt: daysAgo(-1, 10, 0),
      important: true,
      completedAt: null,
      createdBy: ownerId,
      createdAt: daysAgo(0, 9, 5),
    },
    {
      id: "task_ronald_forms",
      leadId: "lead_ronald",
      title: "Send medical history form",
      body: "Email the new-patient form before the exam so the dentist can review medications.",
      dueAt: daysAgo(-2, 17, 0),
      important: false,
      completedAt: null,
      createdBy: staffId,
      createdAt: daysAgo(11, 10, 0),
    },
    {
      id: "task_ronald_insurance",
      leadId: "lead_ronald",
      title: "Verify dental insurance",
      body: "Patient mentioned Denplan. Check remaining cover for a scale and polish.",
      dueAt: daysAgo(-1, 12, 0),
      important: true,
      completedAt: null,
      createdBy: ownerId,
      createdAt: daysAgo(10, 14, 20),
    },
    {
      id: "task_ronald_done",
      leadId: "lead_ronald",
      title: "Share pre-appointment instructions",
      body: "Arrive 10 minutes early. Bring photo ID and a list of current medications.",
      dueAt: daysAgo(3, 9, 0),
      important: false,
      completedAt: daysAgo(3, 9, 40),
      createdBy: staffId,
      createdAt: daysAgo(11, 11, 0),
    },
    {
      id: "task_priya_scan",
      leadId: "lead_priya",
      title: "Book Invisalign scan",
      body: "30-minute iTero slot with Dr Chen. Mention evening availability.",
      dueAt: daysAgo(-2, 11, 0),
      important: false,
      completedAt: null,
      createdBy: ownerId,
      createdAt: daysAgo(5, 16, 0),
    },
    {
      id: "task_tom_prep",
      leadId: "lead_tom",
      title: "Prepare emergency bay",
      body: "Cracked molar. Have peri-apical tray ready and warn the dentist of possible extraction.",
      dueAt: daysAgo(-1, 8, 0),
      important: true,
      completedAt: null,
      createdBy: staffId,
      createdAt: daysAgo(1, 21, 20),
    },
    {
      id: "task_maya_done",
      leadId: "lead_maya",
      title: "Log outcome",
      body: "Patient went elsewhere for aesthetics. Keep the file closed unless they enquire again.",
      dueAt: daysAgo(18, 10, 0),
      important: false,
      completedAt: daysAgo(18, 10, 15),
      createdBy: ownerId,
      createdAt: daysAgo(19, 9, 0),
    },
  ];

  return { leads, conversations, messages, leadTasks, leadEvents };
}

function mergeClinicDemoCrm(data: StoreData) {
  const org = data.organizations.find((o) => o.id === "org_demo");
  const bot = data.chatbots.find((b) => b.id === "bot_demo");
  const owner = data.profiles.find((p) => p.id === "user_clinic");
  const staff = data.profiles.find((p) => p.id === "user_staff");
  if (!org || !bot || !owner || !staff) return false;

  const pack = clinicDemoCrm(org.id, bot.id, owner.id, staff.id);
  const alreadySeeded =
    data.clinicDemoCrmSeeded === true || pack.leads.some((lead) => data.leads.some((row) => row.id === lead.id));
  if (alreadySeeded) {
    if (!data.clinicDemoCrmSeeded) {
      data.clinicDemoCrmSeeded = true;
      return true;
    }
    return false;
  }

  let changed = false;

  const pushIfMissing = <T extends { id: string }>(list: T[], item: T) => {
    if (!list.some((row) => row.id === item.id)) {
      list.push(item);
      changed = true;
    }
  };

  for (const lead of pack.leads) pushIfMissing(data.leads, lead);
  for (const conv of pack.conversations) pushIfMissing(data.conversations, conv);
  for (const msg of pack.messages) pushIfMissing(data.messages, msg);
  for (const task of pack.leadTasks) pushIfMissing(data.leadTasks, task);
  for (const event of pack.leadEvents) pushIfMissing(data.leadEvents, event);

  if (data.leads.some((l) => l.id === "lead_demo") && !data.leadEvents.some((e) => e.id === "evt_lead_demo_new")) {
    const jamie = data.leads.find((l) => l.id === "lead_demo");
    data.leadEvents.push({
      id: "evt_lead_demo_new",
      leadId: "lead_demo",
      body: "Enquiry captured from the website widget.",
      createdAt: jamie?.createdAt || now(),
    });
    changed = true;
  }

  data.clinicDemoCrmSeeded = true;
  return true;
}

function seed(): StoreData {
  const orgId = "org_demo";
  const ownerId = "user_clinic";
  const adminId = "user_admin";
  const botId = "bot_demo";
  const convId = "conv_demo";
  const leadId = "lead_demo";
  const passwordHash = hashPassword("password");
  const pack = clinicDemoCrm(orgId, botId, ownerId, "user_staff");

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
        widgetKey: DEMO_WIDGET_KEY,
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
      ...pack.conversations,
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
        followUpAt: daysAgo(-1, 10, 0),
        notes: "Came in via website widget.",
        createdAt: now(),
      },
      ...pack.leads,
    ],
    leadTasks: pack.leadTasks,
    leadEvents: [
      {
        id: "evt_lead_demo_new",
        leadId,
        body: "Enquiry captured from the website widget.",
        createdAt: now(),
      },
      ...pack.leadEvents,
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
      ...pack.messages,
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
    clinicDemoCrmSeeded: true,
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

  const demoBot = data.chatbots.find((b) => b.id === "bot_demo");
  if (demoBot && demoBot.widgetKey !== DEMO_WIDGET_KEY) {
    const taken = data.chatbots.some((b) => b.id !== demoBot.id && b.widgetKey === DEMO_WIDGET_KEY);
    if (!taken) {
      demoBot.widgetKey = DEMO_WIDGET_KEY;
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

  if (!Array.isArray(data.leadTasks)) {
    data.leadTasks = [];
    changed = true;
  }
  if (!Array.isArray(data.leadEvents)) {
    data.leadEvents = [];
    changed = true;
  }
  if (mergeClinicDemoCrm(data)) changed = true;

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
