import { readStore } from "./store";
import type { Chatbot, Organization } from "./types";

export function widgetAllowed(org: Organization) {
  return (
    org.subscriptionStatus === "active" ||
    org.subscriptionStatus === "trialing" ||
    org.allowWidgetWithoutSub
  );
}

export function widgetTheme(org: Organization, bot: Chatbot) {
  const greetings = (bot.greetings || []).map((g) => g.trim()).filter(Boolean);
  return {
    accent: bot.accentColor || org.primaryColor || "#0f766e",
    panel: bot.panelColor || "#ffffff",
    buttonText: bot.buttonTextColor || "#1a1a1a",
    phone: bot.phone || org.phone || "",
    bookingUrl: bot.bookingUrl || org.bookingUrl || "",
    greetings: greetings.length ? greetings : [bot.greeting].filter(Boolean),
    avatarName: bot.avatarName || "",
    avatarImageUrl: bot.avatarImageUrl || org.logoUrl || "",
  };
}

export async function loadWidget(widgetKey: string): Promise<{ org: Organization; bot: Chatbot } | null> {
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.widgetKey === widgetKey && b.active);
  if (!bot) return null;
  const org = store.organizations.find((o) => o.id === bot.organizationId);
  if (!org) return null;
  return { org, bot };
}
