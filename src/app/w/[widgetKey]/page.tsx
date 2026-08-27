import { notFound } from "next/navigation";
import { readStore } from "@/lib/store";
import { widgetAllowed } from "@/lib/widget";
import { ChatWidget } from "./chat-widget";

export default async function WidgetPage({ params }: { params: Promise<{ widgetKey: string }> }) {
  const { widgetKey } = await params;
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.widgetKey === widgetKey && b.active);
  if (!bot) notFound();
  const org = store.organizations.find((o) => o.id === bot.organizationId);
  if (!org) notFound();
  const options = store.chatbotOptions
    .filter((o) => o.chatbotId === bot.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!widgetAllowed(org)) {
    return (
      <div data-widget-root className="flex h-screen items-end justify-end bg-transparent p-4">
        <div className="card max-w-sm text-sm">This chat is temporarily unavailable.</div>
      </div>
    );
  }

  return (
    <ChatWidget
      widgetKey={widgetKey}
      clinicName={org.name}
      color={org.primaryColor || "#0f766e"}
      logoUrl={org.logoUrl}
      welcomeImageUrl={org.welcomeImageUrl}
      greeting={bot.greeting}
      options={options.map((o) => ({ id: o.id, label: o.label, starterMessage: o.starterMessage }))}
    />
  );
}
