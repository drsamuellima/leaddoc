export type Role = "super_admin" | "clinic_owner" | "clinic_staff";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export type ChatbotActionType = "lead" | "book" | "call";

export type WidgetStyle = "orbital" | "glass" | "sheet" | "messenger" | "dock" | "pulse";

export type WidgetFont = "system" | "instrument" | "manrope" | "jakarta" | "outfit" | "sora" | "dmSans";

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
  widgetStyle: WidgetStyle;
  fontFamily: WidgetFont;
  surfaceColor: string;
  userBubbleColor: string;
  assistantBubbleColor: string;
  launcherColor: string;
  avatarName: string;
  avatarImageUrl: string;
  phone: string;
  bookingUrl: string;
  createdAt: string;
  setupComplete: boolean;
  setup: ChatbotSetup;
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

export type SetupStep = "prescriptions" | "website" | "knowledge" | "interview" | "booking" | "live";

export type SetupScanStatus = "idle" | "scanning" | "ready" | "error";

export type SetupFaqDraft = {
  title: string;
  question: string;
  answer: string;
  source?: "site" | "suggested";
};

export type SetupConfirmField = "name" | "phone" | "booking" | "treatments";

export type SetupInterviewMessage = {
  role: "user" | "assistant";
  content: string;
  confirm?: {
    field: SetupConfirmField;
    value: string;
    status: "pending" | "accepted" | "rejected";
  };
};

export type SetupTreatmentDraft = {
  label: string;
  actionType: ChatbotActionType;
  starterMessage: string;
  url: string;
};

export type SetupExtract = {
  name: string;
  phone: string;
  bookingUrl: string;
  avatarName: string;
  greetings: string[];
  systemPrompt: string;
  faqs: SetupFaqDraft[];
  treatments: SetupTreatmentDraft[];
  pages: string[];
};

export type SetupChecklist = {
  website: boolean;
  knowledge: boolean;
  name: boolean;
  phone: boolean;
  booking: boolean;
  greetings: boolean;
  treatments: boolean;
  prompt: boolean;
};

export type ChatbotSetup = {
  step: SetupStep;
  websiteUrl: string;
  scanStatus: SetupScanStatus;
  scanError: string;
  pendingExtract: SetupExtract | null;
  interview: SetupInterviewMessage[];
  confirmed: Partial<Record<SetupConfirmField, boolean>>;
  awaitingField?: SetupConfirmField;
  checklist: SetupChecklist;
};

export const SETUP_STEPS: { id: SetupStep; title: string; blurb: string }[] = [
  { id: "prescriptions", title: "Prescriptions", blurb: "Pick the treatments Clinix should offer on your AI chat." },
  { id: "website", title: "Website", blurb: "Paste your practice site. We’ll read the homepage and a few key pages." },
  { id: "knowledge", title: "Review knowledge", blurb: "Check what we found. Edit anything before it goes into the chat." },
  { id: "interview", title: "Finish setup", blurb: "A few short questions to fill the gaps." },
  { id: "booking", title: "Booking", blurb: "Add your Dentally or booking link, and the practice phone." },
  { id: "live", title: "Enter Clinix", blurb: "Open your clinic workspace. Activate the widget when you are ready." },
];

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
  treatment: string;
  pipelineId: string | null;
  stageId: string | null;
  amountPence: number | null;
  createdAt: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  sortOrder: number;
};

export type TreatmentPipeline = {
  id: string;
  organizationId: string;
  name: string;
  stages: PipelineStage[];
  createdAt: string;
};

export type LeadNote = {
  id: string;
  leadId: string;
  body: string;
  authorId: string;
  createdAt: string;
};

export type LeadRecall = {
  id: string;
  leadId: string;
  dueAt: string;
  reason: string;
  completedAt: string | null;
  createdBy: string;
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

export type PasswordResetToken = {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
};

export type StoreData = {
  organizations: Organization[];
  profiles: Profile[];
  plans: Plan[];
  chatbots: Chatbot[];
  chatbotOptions: ChatbotOption[];
  knowledgeItems: KnowledgeItem[];
  leads: Lead[];
  pipelines: TreatmentPipeline[];
  leadTasks: LeadTask[];
  leadEvents: LeadEvent[];
  leadNotes: LeadNote[];
  leadRecalls: LeadRecall[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  supportNotes: SupportNote[];
  auditLogs: AuditLog[];
  passwordResetTokens: PasswordResetToken[];
  clinicDemoCrmSeeded?: boolean;
  clinicPipelinesSeeded?: boolean;
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
    widgetStyle: "orbital" as const,
    fontFamily: "system" as const,
    surfaceColor: "#f4f4f0",
    userBubbleColor: primaryColor || "#0f766e",
    assistantBubbleColor: "#f3f4f6",
    launcherColor: primaryColor || "#0f766e",
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

const WIDGET_STYLES: WidgetStyle[] = ["orbital", "glass", "sheet", "messenger", "dock", "pulse"];
const WIDGET_FONTS: WidgetFont[] = ["system", "instrument", "manrope", "jakarta", "outfit", "sora", "dmSans"];

export function parseWidgetStyle(value: string): WidgetStyle {
  return WIDGET_STYLES.includes(value as WidgetStyle) ? (value as WidgetStyle) : "orbital";
}

export function parseWidgetFont(value: string): WidgetFont {
  return WIDGET_FONTS.includes(value as WidgetFont) ? (value as WidgetFont) : "system";
}
