import { notFound } from "next/navigation";
import { readStore } from "@/lib/store";
import { loadWidget, widgetAllowed, widgetTheme } from "@/lib/widget";
import { ChatWidget } from "./chat-widget";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ widgetKey: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { widgetKey } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";
  const loaded = await loadWidget(widgetKey, { allowInactive: isPreview });
  if (!loaded) notFound();
  const { org, bot } = loaded;
  const store = await readStore();
  const options = store.chatbotOptions
    .filter((o) => o.chatbotId === bot.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const theme = widgetTheme(org, bot);

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
      accent={theme.accent}
      panel={theme.panel}
      buttonText={theme.buttonText}
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
