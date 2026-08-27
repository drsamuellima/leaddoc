import { notFound } from "next/navigation";
import { readStore } from "@/lib/store";
import { applyPreviewAppearance, loadWidget, widgetAllowed, widgetTheme } from "@/lib/widget";
import { ChatWidget } from "./chat-widget";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ widgetKey: string }>;
  searchParams: Promise<{
    preview?: string;
    style?: string;
    font?: string;
    accent?: string;
    panel?: string;
    buttonText?: string;
    surface?: string;
    userBubble?: string;
    assistantBubble?: string;
    launcher?: string;
  }>;
}) {
  const { widgetKey } = await params;
  const search = await searchParams;
  const isPreview = search.preview === "1";
  const loaded = await loadWidget(widgetKey, { allowInactive: isPreview });
  if (!loaded) notFound();
  const { org, bot } = loaded;
  const store = await readStore();
  const options = store.chatbotOptions
    .filter((o) => o.chatbotId === bot.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const theme = applyPreviewAppearance(widgetTheme(org, bot), search, isPreview);

  if (!isPreview && !widgetAllowed(org)) {
    return (
      <div data-widget-root className="absolute inset-0 flex h-full items-center justify-center bg-white p-4">
        <div className="card max-w-sm text-sm">This chat is temporarily unavailable.</div>
      </div>
    );
  }

  return (
    <ChatWidget
      widgetKey={widgetKey}
      clinicName={org.name}
      widgetStyle={theme.widgetStyle}
      fontFamily={theme.fontFamily}
      accent={theme.accent}
      panel={theme.panel}
      buttonText={theme.buttonText}
      surface={theme.surface}
      userBubble={theme.userBubble}
      assistantBubble={theme.assistantBubble}
      launcher={theme.launcher}
      avatarName={theme.avatarName}
      avatarImageUrl={theme.avatarImageUrl}
      greetings={theme.greetings}
      phone={theme.phone}
      bookingUrl={theme.bookingUrl}
      startOpen={isPreview}
      preview={isPreview}
      options={options.map((o) => ({
        id: o.id,
        label: o.label,
        starterMessage: o.starterMessage,
        actionType: o.actionType || "lead",
        url: o.url || "",
      }))}
    />
  );
}
