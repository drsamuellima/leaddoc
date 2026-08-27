import { readStore } from "./store";
import type { Chatbot, Organization } from "./types";

export function widgetAllowed(org: Organization) {
  return (
    org.subscriptionStatus === "active" ||
    org.subscriptionStatus === "trialing" ||
    org.allowWidgetWithoutSub
  );
}

export async function loadWidget(widgetKey: string): Promise<{ org: Organization; bot: Chatbot } | null> {
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.widgetKey === widgetKey && b.active);
  if (!bot) return null;
  const org = store.organizations.find((o) => o.id === bot.organizationId);
  if (!org) return null;
  return { org, bot };
}
