export type Role = "super_admin" | "clinic_owner" | "clinic_staff";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export type ChatbotActionType = "lead" | "book" | "call";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  welcomeImageUrl: string;
  phone: string;
  bookingUrl: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  allowWidgetWithoutSub: boolean;
  createdAt: string;
};

export type Profile = {
  id: string;
  organizationId: string | null;
  role: Role;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Plan = {
  id: string;
  name: string;
  amountPence: number;
  interval: "month";
  stripePriceId: string;
  active: boolean;
};

export type Chatbot = {
  id: string;
  organizationId: string;
  name: string;
  /** First greeting; kept in sync with greetings[0] for older screens. */
  greeting: string;
  greetings: string[];
  systemPrompt: string;
  widgetKey: string;
  active: boolean;
  accentColor: string;
  panelColor: string;
  buttonTextColor: string;
  avatarName: string;
  avatarImageUrl: string;
  phone: string;
  bookingUrl: string;
  createdAt: string;
};

export type ChatbotOption = {
  id: string;
  chatbotId: string;
  label: string;
  starterMessage: string;
  sortOrder: number;
  actionType: ChatbotActionType;
  url: string;
};

export type KnowledgeItem = {
  id: string;
  chatbotId: string;
  title: string;
  question: string;
  answer: string;
};

export type Lead = {
  id: string;
  organizationId: string;
  chatbotId: string;
  conversationId: string;
  name: string;
  email: string;
  phone: string;
  inquiry: string;
  status: LeadStatus;
  assignedTo: string | null;
  followUpAt: string | null;
  notes: string;
  createdAt: string;
};

export type LeadTask = {
  id: string;
  leadId: string;
  title: string;
  body: string;
  dueAt: string | null;
  important: boolean;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type LeadEvent = {
  id: string;
  leadId: string;
  body: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  organizationId: string;
  chatbotId: string;
  leadId: string | null;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  organizationId: string;
  type: "new_lead";
  title: string;
  body: string;
  leadId: string;
  readAt: string | null;
  createdAt: string;
};

export type SupportNote = {
  id: string;
  organizationId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string;
  action: string;
  organizationId: string | null;
  detail: string;
  createdAt: string;
};

export type StoreData = {
  organizations: Organization[];
  profiles: Profile[];
  plans: Plan[];
  chatbots: Chatbot[];
  chatbotOptions: ChatbotOption[];
  knowledgeItems: KnowledgeItem[];
  leads: Lead[];
  leadTasks: LeadTask[];
  leadEvents: LeadEvent[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  supportNotes: SupportNote[];
  auditLogs: AuditLog[];
};

export function defaultGreetings(clinicName: string, avatarName = ""): string[] {
  return [
    `Welcome to ${clinicName}.`,
    avatarName ? `I'm ${avatarName}, here to help with your enquiry` : "I'm here to help with your enquiry",
    "Which of our services are you interested in?",
  ];
}

export function widgetFieldDefaults(clinicName: string, primaryColor: string, avatarName = "") {
  const greetings = defaultGreetings(clinicName, avatarName);
  return {
    greeting: greetings[0],
    greetings,
    accentColor: primaryColor || "#0f766e",
    panelColor: "#ffffff",
    buttonTextColor: "#1a1a1a",
    avatarName,
    avatarImageUrl: "",
    phone: "",
    bookingUrl: "",
  };
}

export function parseActionType(value: string): ChatbotActionType {
  if (value === "book" || value === "call" || value === "lead") return value;
  return "lead";
}
