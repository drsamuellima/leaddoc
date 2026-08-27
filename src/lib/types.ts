export type Role = "super_admin" | "clinic_owner" | "clinic_staff";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  welcomeImageUrl: string;
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
  greeting: string;
  systemPrompt: string;
  widgetKey: string;
  active: boolean;
  createdAt: string;
};

export type ChatbotOption = {
  id: string;
  chatbotId: string;
  label: string;
  starterMessage: string;
  sortOrder: number;
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
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  supportNotes: SupportNote[];
  auditLogs: AuditLog[];
};
