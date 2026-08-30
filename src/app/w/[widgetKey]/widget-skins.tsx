"use client";

import { BrandLogo } from "@/components/brand-logo";
import type { CSSProperties, ReactNode } from "react";
import { Avatar, TypingDots, type Option, type WidgetController } from "./chat-widget";

function edge(ctrl: WidgetController) {
  return ctrl.widgetPosition === "bottom-left" ? "justify-start" : "justify-end";
}

function tokenStyle(ctrl: WidgetController): CSSProperties {
  return {
    fontFamily: ctrl.fontCss,
    color: ctrl.buttonText,
    ["--dc-accent" as string]: ctrl.accent,
    ["--dc-panel" as string]: ctrl.panel,
    ["--dc-text" as string]: ctrl.buttonText,
    ["--dc-surface" as string]: ctrl.surface,
    ["--dc-user" as string]: ctrl.userBubble,
    ["--dc-assistant" as string]: ctrl.assistantBubble,
    ["--dc-launcher" as string]: ctrl.launcher,
  };
}

function BrandMark() {
  return (
    <div className="flex items-center rounded-full bg-white/95 px-2.5 py-1 shadow-md">
      <BrandLogo on="light" size="widget" />
    </div>
  );
}

function GreetingSequence(props: {
  ctrl: WidgetController;
  bubbleRadius?: string;
  avatarSize?: number;
}) {
  const { ctrl } = props;
  const radius = props.bubbleRadius || "1rem";
  const size = props.avatarSize ?? 36;
  return (
    <div className="space-y-3">
      {ctrl.greetings.map((greeting, i) => (
        <div key={`${i}-${greeting.slice(0, 24)}`} className="grid">
          {ctrl.playIntro ? (
            <div
              className="dentchat-seq-typing col-start-1 row-start-1 flex items-end gap-2"
              style={{ animationDelay: `${i * 1}s` }}
              aria-hidden
            >
              <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={size} />
              <div className="px-3.5 py-2.5 shadow-sm" style={{ background: ctrl.panel, borderRadius: radius }}>
                <TypingDots color={ctrl.accent} />
              </div>
            </div>
          ) : null}
          <div
            className={`col-start-1 row-start-1 flex items-end gap-2 ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}
            style={ctrl.playIntro ? { animationDelay: `${i * 1 + 0.38}s` } : undefined}
          >
            <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={size} />
            <div
              className="max-w-[85%] px-3.5 py-2.5 text-sm leading-snug shadow-sm"
              style={{ background: ctrl.panel, color: ctrl.buttonText, borderRadius: radius }}
            >
              {greeting}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadForm({ ctrl, className }: { ctrl: WidgetController; className?: string }) {
  return (
    <form onSubmit={ctrl.startLead} className={className} style={{ background: ctrl.panel, color: ctrl.buttonText }}>
      <p className="text-sm font-semibold">Leave your details and we’ll help with your enquiry.</p>
      <input required value={ctrl.name} onChange={(e) => ctrl.setName(e.target.value)} placeholder="Full name" />
      <input required type="email" value={ctrl.email} onChange={(e) => ctrl.setEmail(e.target.value)} placeholder="Email" />
      <input required value={ctrl.visitorPhone} onChange={(e) => ctrl.setVisitorPhone(e.target.value)} placeholder="Phone" />
      <textarea required rows={3} value={ctrl.inquiry} onChange={(e) => ctrl.setInquiry(e.target.value)} placeholder="Your enquiry" />
      <div className="flex gap-2">
        <button type="button" className="btn secondary flex-1" onClick={() => ctrl.setView("home")}>
          Back
        </button>
        <button className="btn flex-1" style={{ background: ctrl.accent, color: "#fff" }} disabled={ctrl.busy}>
          {ctrl.busy ? "Starting…" : "Start chat"}
        </button>
      </div>
    </form>
  );
}

function ChatThread({ ctrl, className }: { ctrl: WidgetController; className?: string }) {
  return (
    <div className={className} style={{ background: ctrl.panel, color: ctrl.buttonText }}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
        {ctrl.messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-2xl px-3 py-2 ${m.role === "user" ? "ml-auto text-white" : ""}`}
            style={
              m.role === "user"
                ? { background: ctrl.userBubble, color: "#fff" }
                : { background: ctrl.assistantBubble, color: ctrl.buttonText }
            }
          >
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={ctrl.send} className="mt-3 flex gap-2">
        <input value={ctrl.draft} onChange={(e) => ctrl.setDraft(e.target.value)} placeholder="Message" />
        <button className="btn" style={{ background: ctrl.accent, color: "#fff" }} disabled={ctrl.busy}>
          Send
        </button>
      </form>
    </div>
  );
}

function HeaderActions({ ctrl, light }: { ctrl: WidgetController; light?: boolean }) {
  const bg = light ? "rgba(255,255,255,0.92)" : ctrl.panel;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={ctrl.reset}
        aria-label="Reset chat"
        className="flex h-10 w-10 items-center justify-center rounded-full shadow-md"
        style={{ background: bg, color: ctrl.accent }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M21 12a9 9 0 1 1-3.2-6.8" strokeLinecap="round" />
          <path d="M21 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={ctrl.close}
        aria-label="Close chat"
        className="flex h-10 w-10 items-center justify-center rounded-full shadow-md"
        style={{ background: bg, color: ctrl.buttonText }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function Body({
  ctrl,
  home,
}: {
  ctrl: WidgetController;
  home: ReactNode;
}) {
  return (
    <>
      {ctrl.view === "home" ? <div key={ctrl.seqKey}>{home}</div> : null}
      {ctrl.view === "lead" ? <LeadForm ctrl={ctrl} className="mt-1 space-y-3 rounded-[1.35rem] p-4 shadow-lg" /> : null}
      {ctrl.view === "chat" ? (
        <ChatThread ctrl={ctrl} className="mt-1 flex min-h-[12rem] flex-1 flex-col rounded-[1.35rem] p-3 shadow-lg" />
      ) : null}
      {ctrl.error ? <p className="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm text-red-700 shadow">{ctrl.error}</p> : null}
    </>
  );
}

function OptionGrid({
  ctrl,
  className,
  itemClass,
}: {
  ctrl: WidgetController;
  className?: string;
  itemClass?: string;
}) {
  return (
    <div className={className}>
      {ctrl.options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => ctrl.onAction(option)}
          className={itemClass}
          style={{ background: ctrl.panel, color: ctrl.buttonText }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function optionKind(option: Option) {
  if (option.actionType === "book") return "Book";
  if (option.actionType === "call") return "Call";
  return "Chat";
}

function LauncherButton({
  ctrl,
  className,
  children,
}: {
  ctrl: WidgetController;
  className: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className={className} style={{ background: ctrl.launcher, color: "#fff" }} onClick={ctrl.openChat} aria-label="Open chat">
      {children}
    </button>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H7l-4 3V12A8.5 8.5 0 1 1 21 12Z" strokeLinejoin="round" />
    </svg>
  );
}

function OrbitalSkin({ ctrl }: { ctrl: WidgetController }) {
  const previewStyle = ctrl.preview
    ? { background: "linear-gradient(180deg, #f8f4ee 0%, #eef3f5 48%, #e7eee9 100%)" }
    : undefined;
  return (
    <div data-widget-root data-skin="orbital" className="relative h-full max-h-full min-h-0 w-full overflow-hidden bg-transparent" style={{ ...tokenStyle(ctrl), ...previewStyle }}>
      {ctrl.open ? (
        <div className={`flex h-full max-h-full min-h-0 ${edge(ctrl)} bg-transparent`}>
          <div
            className="dentchat-panel relative flex h-full max-h-full min-h-0 w-full max-w-[420px] flex-col"
            style={
              ctrl.preview
                ? undefined
                : {
                    background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.14) 28%, rgba(0,0,0,0.26) 100%)",
                  }
            }
          >
            <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
              <div className="inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1 shadow-sm" style={{ background: ctrl.panel }}>
                <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={28} />
                <span className="truncate pr-2 text-sm font-semibold" style={{ color: ctrl.buttonText }}>
                  {ctrl.clinicName}
                </span>
              </div>
              <HeaderActions ctrl={ctrl} light />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
              <Body
                ctrl={ctrl}
                home={
                  <>
                    <GreetingSequence ctrl={ctrl} />
                    <div
                      className={`mt-5 rounded-[1.35rem] p-2.5 shadow-lg ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}
                      style={{
                        background: ctrl.panel,
                        ...(ctrl.playIntro ? { animationDelay: `${ctrl.greetings.length * 1 + 0.2}s` } : {}),
                      }}
                    >
                      <OptionGrid
                        ctrl={ctrl}
                        className="grid grid-cols-2 gap-2.5"
                        itemClass="min-h-[3.4rem] rounded-xl px-2 py-3 text-center text-[13px] font-medium leading-snug shadow-sm"
                      />
                    </div>
                  </>
                }
              />
            </div>
            <div className="flex shrink-0 items-center justify-end px-4 py-2">
              <BrandMark />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex h-full items-end ${edge(ctrl)} p-2`}>
          <LauncherButton ctrl={ctrl} className="dentchat-launcher flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
            <ChatIcon />
          </LauncherButton>
        </div>
      )}
    </div>
  );
}

function GlassSkin({ ctrl }: { ctrl: WidgetController }) {
  return (
    <div data-widget-root data-skin="glass" className="relative h-full w-full overflow-hidden" style={{ ...tokenStyle(ctrl), background: ctrl.preview ? ctrl.surface : "transparent" }}>
      {ctrl.open ? (
        <div className={`flex h-full items-end ${edge(ctrl)} p-3`}>
          <div className="dentchat-panel dentchat-glass flex h-[min(100%,560px)] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] shadow-2xl">
            <header className="flex items-center justify-between gap-2 px-3 pt-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{ctrl.clinicName}</div>
                  <div className="text-[11px] opacity-70">Usually replies instantly</div>
                </div>
              </div>
              <HeaderActions ctrl={ctrl} />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <Body
                ctrl={ctrl}
                home={
                  <>
                    <GreetingSequence ctrl={ctrl} bubbleRadius="1.15rem" />
                    <OptionGrid
                      ctrl={ctrl}
                      className={`mt-4 flex flex-wrap gap-2 ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}
                      itemClass="rounded-full px-3.5 py-2 text-[12px] font-semibold shadow-sm"
                    />
                  </>
                }
              />
            </div>
            <div className="flex justify-end px-3 pb-3">
              <BrandMark />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex h-full items-end ${edge(ctrl)} p-3`}>
          <LauncherButton ctrl={ctrl} className="dentchat-launcher flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg">
            <ChatIcon />
            Chat
          </LauncherButton>
        </div>
      )}
    </div>
  );
}

function SheetSkin({ ctrl }: { ctrl: WidgetController }) {
  return (
    <div data-widget-root data-skin="sheet" className="relative h-full w-full overflow-hidden" style={{ ...tokenStyle(ctrl), background: ctrl.preview ? ctrl.surface : "transparent" }}>
      {ctrl.open ? (
        <div className="flex h-full items-end justify-center">
          <div className="dentchat-panel flex max-h-[92%] w-full max-w-[420px] flex-col rounded-t-[28px] shadow-2xl" style={{ background: ctrl.panel }}>
            <div className="flex justify-center pt-2">
              <span className="h-1 w-10 rounded-full bg-black/20" />
            </div>
            <header className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={36} />
                <span className="text-[15px] font-semibold">{ctrl.clinicName}</span>
              </div>
              <HeaderActions ctrl={ctrl} light />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              <Body
                ctrl={ctrl}
                home={
                  <>
                    <GreetingSequence ctrl={ctrl} bubbleRadius="1.25rem" avatarSize={40} />
                    <div className={`mt-4 space-y-2 ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}>
                      {ctrl.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => ctrl.onAction(option)}
                          className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-medium"
                          style={{ background: ctrl.surface, color: ctrl.buttonText }}
                        >
                          {option.label}
                          <span className="text-[11px] font-semibold opacity-50">{optionKind(option)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                }
              />
            </div>
            <div className="flex justify-center pb-4">
              <BrandMark />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex h-full items-end ${edge(ctrl)} p-3`}>
          <LauncherButton ctrl={ctrl} className="dentchat-launcher flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg">
            <ChatIcon />
          </LauncherButton>
        </div>
      )}
    </div>
  );
}

function MessengerSkin({ ctrl }: { ctrl: WidgetController }) {
  return (
    <div data-widget-root data-skin="messenger" className="relative h-full w-full overflow-hidden" style={{ ...tokenStyle(ctrl), background: ctrl.preview ? ctrl.surface : "transparent" }}>
      {ctrl.open ? (
        <div className={`flex h-full ${edge(ctrl)}`}>
          <div className="dentchat-panel flex h-full w-full max-w-[420px] flex-col" style={{ background: ctrl.surface }}>
            <header className="flex items-center justify-between gap-2 px-3 py-2.5 shadow-sm" style={{ background: ctrl.panel }}>
              <div className="flex min-w-0 items-center gap-2">
                <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={34} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{ctrl.clinicName}</div>
                  <div className="text-[11px]" style={{ color: ctrl.accent }}>
                    Online
                  </div>
                </div>
              </div>
              <HeaderActions ctrl={ctrl} light />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <Body
                ctrl={ctrl}
                home={
                  <>
                    <GreetingSequence ctrl={ctrl} bubbleRadius="1.05rem 1.05rem 1.05rem 0.35rem" />
                    <div className={`mt-3 flex flex-wrap gap-1.5 ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}>
                      {ctrl.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => ctrl.onAction(option)}
                          className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                          style={{
                            color: ctrl.accent,
                            boxShadow: `inset 0 0 0 1.5px ${ctrl.accent}`,
                            background: ctrl.panel,
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                }
              />
            </div>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: ctrl.panel }}>
              <BrandMark />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex h-full items-end ${edge(ctrl)} p-2`}>
          <LauncherButton ctrl={ctrl} className="dentchat-launcher flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
            <ChatIcon />
          </LauncherButton>
        </div>
      )}
    </div>
  );
}

function DockSkin({ ctrl }: { ctrl: WidgetController }) {
  return (
    <div data-widget-root data-skin="dock" className="relative h-full w-full overflow-hidden" style={{ ...tokenStyle(ctrl), background: ctrl.preview ? ctrl.surface : "transparent" }}>
      {ctrl.open ? (
        <div className={`flex h-full ${edge(ctrl)}`}>
          <div className="dentchat-panel flex h-full w-full max-w-[340px] flex-col" style={{ background: ctrl.panel }}>
            <header className="flex items-center gap-2 px-3 py-3">
              <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{ctrl.clinicName}</div>
                <div className="truncate text-[11px] opacity-60">{ctrl.avatarLabel}</div>
              </div>
              <HeaderActions ctrl={ctrl} />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              <Body
                ctrl={ctrl}
                home={
                  <>
                    <GreetingSequence ctrl={ctrl} bubbleRadius="0.85rem" avatarSize={28} />
                    <div className={`mt-4 space-y-1.5 ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}>
                      {ctrl.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => ctrl.onAction(option)}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium"
                          style={{ background: ctrl.surface, color: ctrl.buttonText }}
                        >
                          <span
                            className="grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold"
                            style={{ background: ctrl.accent, color: ctrl.panel }}
                          >
                            {optionKind(option)[0]}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                }
              />
            </div>
            <div className="px-3 pb-3">
              <BrandMark />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex h-full items-end ${edge(ctrl)} p-2`}>
          <LauncherButton ctrl={ctrl} className="dentchat-launcher flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
            <ChatIcon />
          </LauncherButton>
        </div>
      )}
    </div>
  );
}

function PulseSkin({ ctrl }: { ctrl: WidgetController }) {
  return (
    <div data-widget-root data-skin="pulse" className="relative h-full w-full overflow-hidden" style={{ ...tokenStyle(ctrl), background: ctrl.preview ? ctrl.surface : "transparent" }}>
      {ctrl.open ? (
        <div className={`flex h-full ${edge(ctrl)} p-2`}>
          <div className="dentchat-panel flex h-full w-full max-w-[400px] flex-col overflow-hidden rounded-[26px]" style={{ background: ctrl.panel }}>
            <header className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <Avatar src={ctrl.avatarImageUrl} name={ctrl.avatarLabel} accent={ctrl.accent} size={30} />
                <span className="text-sm font-semibold tracking-tight">{ctrl.clinicName}</span>
              </div>
              <HeaderActions ctrl={ctrl} />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-3">
              <Body
                ctrl={ctrl}
                home={
                  <>
                    <GreetingSequence ctrl={ctrl} bubbleRadius="1.2rem 1.2rem 1.2rem 0.25rem" />
                    <div
                      className={`mt-4 grid grid-cols-2 gap-2 ${ctrl.playIntro ? "dentchat-seq-bubble" : ""}`}
                    >
                      {ctrl.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => ctrl.onAction(option)}
                          className="min-h-[4rem] rounded-[1.15rem] px-2.5 py-3 text-center text-[12px] font-semibold leading-snug"
                          style={{
                            background: ctrl.surface,
                            color: ctrl.buttonText,
                            boxShadow: `0 0 0 1px color-mix(in srgb, ${ctrl.accent} 35%, transparent)`,
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                }
              />
            </div>
            <div className="flex justify-end px-3 py-2">
              <BrandMark />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex h-full items-end ${edge(ctrl)} p-3`}>
          <div className="relative">
            <span className="dentchat-pulse-ring absolute inset-0 rounded-full" style={{ background: ctrl.launcher }} />
            <LauncherButton ctrl={ctrl} className="dentchat-launcher relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
              <ChatIcon />
            </LauncherButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function WidgetSkins({ ctrl }: { ctrl: WidgetController }) {
  switch (ctrl.widgetStyle) {
    case "glass":
      return <GlassSkin ctrl={ctrl} />;
    case "sheet":
      return <SheetSkin ctrl={ctrl} />;
    case "messenger":
      return <MessengerSkin ctrl={ctrl} />;
    case "dock":
      return <DockSkin ctrl={ctrl} />;
    case "pulse":
      return <PulseSkin ctrl={ctrl} />;
    default:
      return <OrbitalSkin ctrl={ctrl} />;
  }
}
