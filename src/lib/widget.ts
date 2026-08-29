import { appearanceFromQuery, type AppearanceTokens } from "./widget-appearance";
import { findWidget } from "./store";
import type { Chatbot, Organization } from "./types";
import { parseWidgetFont, parseWidgetStyle } from "./types";

export function widgetAllowed(org: Organization) {
  return (
    org.subscriptionStatus === "active" ||
    org.subscriptionStatus === "trialing" ||
    org.allowWidgetWithoutSub
  );
}

export function widgetTheme(org: Organization, bot: Chatbot): AppearanceTokens & {
  phone: string;
  bookingUrl: string;
  greetings: string[];
  avatarName: string;
  avatarImageUrl: string;
} {
  const greetings = (bot.greetings || []).map((g) => g.trim()).filter(Boolean);
  const accent = bot.accentColor || org.primaryColor || "#0f766e";
  return {
    widgetStyle: parseWidgetStyle(bot.widgetStyle || "orbital"),
    fontFamily: parseWidgetFont(bot.fontFamily || "system"),
    accent,
    panel: bot.panelColor || "#ffffff",
    buttonText: bot.buttonTextColor || "#1a1a1a",
    surface: bot.surfaceColor || "#f4f4f0",
    userBubble: bot.userBubbleColor || accent,
    assistantBubble: bot.assistantBubbleColor || "#f3f4f6",
    launcher: bot.launcherColor || accent,
    phone: bot.phone || org.phone || "",
    bookingUrl: bot.bookingUrl || org.bookingUrl || "",
    greetings: greetings.length ? greetings : [bot.greeting].filter(Boolean),
    avatarName: bot.avatarName || "",
    avatarImageUrl: bot.avatarImageUrl || org.logoUrl || "",
  };
}

export function applyPreviewAppearance(
  theme: ReturnType<typeof widgetTheme>,
  search: Record<string, string | undefined>,
  isPreview: boolean,
) {
  if (!isPreview) return theme;
  const overlay = appearanceFromQuery(search, theme);
  return { ...theme, ...overlay };
}

export async function loadWidget(
  widgetKey: string,
  opts?: { allowInactive?: boolean },
): Promise<{ org: Organization; bot: Chatbot } | null> {
  const loaded = await findWidget(widgetKey);
  if (!loaded) return null;
  if (!opts?.allowInactive && !loaded.bot.active) return null;
  return loaded;
}
