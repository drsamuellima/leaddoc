import type { WidgetFont, WidgetPosition, WidgetStyle } from "./types";
import { parseWidgetFont, parseWidgetPosition, parseWidgetStyle } from "./types";

export type AppearanceTokens = {
  widgetStyle: WidgetStyle;
  widgetPosition: WidgetPosition;
  fontFamily: WidgetFont;
  accent: string;
  panel: string;
  buttonText: string;
  surface: string;
  userBubble: string;
  assistantBubble: string;
  launcher: string;
};

export const WIDGET_STYLE_META: {
  id: WidgetStyle;
  name: string;
  blurb: string;
  options: string;
  suggested: Pick<AppearanceTokens, "accent" | "panel" | "buttonText" | "surface" | "userBubble" | "assistantBubble" | "launcher">;
}[] = [
  {
    id: "orbital",
    name: "Orbital",
    blurb: "Pill header, sequential greetings, circular launcher.",
    options: "Two-column cards",
    suggested: {
      accent: "#1d9e75",
      panel: "#fffefb",
      buttonText: "#1c1917",
      surface: "#f3eee6",
      userBubble: "#1d9e75",
      assistantBubble: "#f4f0ea",
      launcher: "#1d9e75",
    },
  },
  {
    id: "glass",
    name: "Glass",
    blurb: "Frosted panel, airy chips, slim launcher.",
    options: "Wrap chips",
    suggested: {
      accent: "#6d7cff",
      panel: "#f7f8ff",
      buttonText: "#1b1f3b",
      surface: "#e4e9ff",
      userBubble: "#5b6cff",
      assistantBubble: "#eef1ff",
      launcher: "#6d7cff",
    },
  },
  {
    id: "sheet",
    name: "Sheet",
    blurb: "Bottom sheet, grab handle, large type.",
    options: "Full-width rows",
    suggested: {
      accent: "#2c2a26",
      panel: "#f6f3ee",
      buttonText: "#1a1916",
      surface: "#ede8e0",
      userBubble: "#2c2a26",
      assistantBubble: "#e7e1d8",
      launcher: "#2c2a26",
    },
  },
  {
    id: "messenger",
    name: "Messenger",
    blurb: "Full-height thread and compact composer.",
    options: "Suggestion pills",
    suggested: {
      accent: "#4c8dff",
      panel: "#ffffff",
      buttonText: "#0f172a",
      surface: "#eaf2ff",
      userBubble: "#4c8dff",
      assistantBubble: "#ffffff",
      launcher: "#4c8dff",
    },
  },
  {
    id: "dock",
    name: "Dock",
    blurb: "Narrow column with an avatar rail.",
    options: "Icon + label list",
    suggested: {
      accent: "#5eead4",
      panel: "#16181d",
      buttonText: "#f3f4f6",
      surface: "#0e1014",
      userBubble: "#0f766e",
      assistantBubble: "#23262e",
      launcher: "#14b8a6",
    },
  },
  {
    id: "pulse",
    name: "Pulse",
    blurb: "Gradient ring launcher, high-contrast tiles.",
    options: "Rounded tiles",
    suggested: {
      accent: "#f472b6",
      panel: "#17111a",
      buttonText: "#fdecf2",
      surface: "#120c10",
      userBubble: "#db2777",
      assistantBubble: "#2a1d26",
      launcher: "#db2777",
    },
  },
];

export const WIDGET_POSITION_META: { id: WidgetPosition; name: string; blurb: string }[] = [
  { id: "bottom-right", name: "Bottom right", blurb: "Usual chat corner on a website." },
  { id: "bottom-left", name: "Bottom left", blurb: "Opposite side — useful if the right is already busy." },
];

export const WIDGET_FONT_META: { id: WidgetFont; name: string; stack: string; cssVar: string }[] = [
  { id: "system", name: "Geist", stack: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif", cssVar: "--font-geist-sans" },
  { id: "instrument", name: "Instrument Sans", stack: "var(--font-instrument), ui-sans-serif, sans-serif", cssVar: "--font-instrument" },
  { id: "manrope", name: "Manrope", stack: "var(--font-manrope), ui-sans-serif, sans-serif", cssVar: "--font-manrope" },
  { id: "jakarta", name: "Plus Jakarta", stack: "var(--font-jakarta), ui-sans-serif, sans-serif", cssVar: "--font-jakarta" },
  { id: "outfit", name: "Outfit", stack: "var(--font-outfit), ui-sans-serif, sans-serif", cssVar: "--font-outfit" },
  { id: "sora", name: "Sora", stack: "var(--font-sora), ui-sans-serif, sans-serif", cssVar: "--font-sora" },
  { id: "dmSans", name: "DM Sans", stack: "var(--font-dm-sans), ui-sans-serif, sans-serif", cssVar: "--font-dm-sans" },
];

export type ColorTokenKey = "accent" | "panel" | "buttonText" | "surface" | "userBubble" | "assistantBubble" | "launcher";

export function fontStack(id: WidgetFont) {
  return WIDGET_FONT_META.find((f) => f.id === id)?.stack || WIDGET_FONT_META[0].stack;
}

export function parseHexColor(value: string, fallback: string) {
  const raw = String(value || "").trim();
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const [, a, b, c] = hex;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return fallback;
}

export function appearanceToQuery(tokens: AppearanceTokens) {
  const q = new URLSearchParams();
  q.set("style", tokens.widgetStyle);
  q.set("position", tokens.widgetPosition);
  q.set("font", tokens.fontFamily);
  q.set("accent", tokens.accent.replace("#", ""));
  q.set("panel", tokens.panel.replace("#", ""));
  q.set("buttonText", tokens.buttonText.replace("#", ""));
  q.set("surface", tokens.surface.replace("#", ""));
  q.set("userBubble", tokens.userBubble.replace("#", ""));
  q.set("assistantBubble", tokens.assistantBubble.replace("#", ""));
  q.set("launcher", tokens.launcher.replace("#", ""));
  return q.toString();
}

export function appearanceFromQuery(
  search: Record<string, string | undefined>,
  base: AppearanceTokens,
): AppearanceTokens {
  return {
    widgetStyle: parseWidgetStyle(search.style || base.widgetStyle),
    widgetPosition: parseWidgetPosition(search.position || base.widgetPosition),
    fontFamily: parseWidgetFont(search.font || base.fontFamily),
    accent: parseHexColor(search.accent || "", base.accent),
    panel: parseHexColor(search.panel || "", base.panel),
    buttonText: parseHexColor(search.buttonText || "", base.buttonText),
    surface: parseHexColor(search.surface || "", base.surface),
    userBubble: parseHexColor(search.userBubble || "", base.userBubble),
    assistantBubble: parseHexColor(search.assistantBubble || "", base.assistantBubble),
    launcher: parseHexColor(search.launcher || "", base.launcher),
  };
}

export const COLOR_FIELDS: { key: ColorTokenKey; name: string; hint: string }[] = [
  { key: "accent", name: "Accent", hint: "Rings, links, primary actions" },
  { key: "panel", name: "Panel", hint: "Cards, header chips, sheet body" },
  { key: "buttonText", name: "Ink", hint: "Labels and greeting text" },
  { key: "surface", name: "Surface", hint: "Chrome behind the conversation" },
  { key: "userBubble", name: "You", hint: "Visitor message bubbles" },
  { key: "assistantBubble", name: "Bot", hint: "Assistant message bubbles" },
  { key: "launcher", name: "Launcher", hint: "Open-chat button" },
];
