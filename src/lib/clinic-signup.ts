import { randomUUID } from "crypto";
import { emptySetup } from "./chatbot-setup";
import { useJsonStore } from "./config";
import { hashPassword, widgetKey } from "./crypto";
import { generalPipeline } from "./pipelines";
import { createClinicSignupPg } from "./store-pg";
import { mutateStore, slugify } from "./store";
import { widgetFieldDefaults, type Chatbot, type Organization, type Profile } from "./types";

function iso() {
  return new Date().toISOString();
}

export function buildClinicSignup(input: {
  name: string;
  clinicName: string;
  email: string;
  passwordHash: string;
}) {
  const orgId = randomUUID();
  const userId = randomUUID();
  const botId = randomUUID();
  const createdAt = iso();
  const org: Organization = {
    id: orgId,
    name: input.clinicName,
    slug: slugify(input.clinicName) + "-" + orgId.slice(0, 6),
    logoUrl: "",
    primaryColor: "#0f766e",
    welcomeImageUrl: "",
    phone: "",
    bookingUrl: "",
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    subscriptionStatus: "inactive",
    allowWidgetWithoutSub: false,
    createdAt,
  };
  const user: Profile = {
    id: userId,
    organizationId: orgId,
    role: "clinic_owner",
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt,
  };
  const bot: Chatbot = {
    id: botId,
    organizationId: orgId,
    name: input.clinicName,
    ...widgetFieldDefaults(input.clinicName, "#0f766e"),
    systemPrompt: `You are a helpful receptionist for ${input.clinicName}, a dental practice.`,
    widgetKey: widgetKey(),
    active: false,
    createdAt,
    setupComplete: false,
    setup: emptySetup(),
  };
  return { org, user, bot, pipeline: generalPipeline(orgId, createdAt) };
}

export async function createClinicSignup(input: {
  name: string;
  clinicName: string;
  email: string;
  password: string;
}): Promise<{ userId: string; botId: string; orgId: string } | { error: "exists" }> {
  const passwordHash = hashPassword(input.password);
  const built = buildClinicSignup({
    name: input.name,
    clinicName: input.clinicName,
    email: input.email,
    passwordHash,
  });
  if (useJsonStore()) {
    return mutateStore((data) => {
      if (data.profiles.some((p) => p.email.toLowerCase() === input.email)) {
        return { error: "exists" as const };
      }
      data.organizations.push(built.org);
      data.profiles.push(built.user);
      data.chatbots.push(built.bot);
      data.pipelines.push(built.pipeline);
      return { userId: built.user.id, botId: built.bot.id, orgId: built.org.id };
    });
  }
  return createClinicSignupPg({
    email: input.email,
    org: built.org,
    user: built.user,
    bot: built.bot,
    pipeline: built.pipeline,
  });
}
