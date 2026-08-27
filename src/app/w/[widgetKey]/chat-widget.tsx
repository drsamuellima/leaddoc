"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatbotActionType } from "@/lib/types";

type Option = {
  id: string;
  label: string;
  starterMessage: string;
  actionType: ChatbotActionType;
  url: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

type View = "home" | "lead" | "chat";

function telHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function notifyParent(type: "open" | "close") {
  if (typeof window === "undefined") return;
  window.parent.postMessage({ source: "dentchat", type }, "*");
}

function Avatar(props: { src: string; name: string; accent: string; size: number }) {
  const initial = (props.name.trim()[0] || "?").toUpperCase();
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-slate-100"
      style={{
        width: props.size,
        height: props.size,
        boxShadow: `0 0 0 2px ${props.accent}`,
      }}
    >
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-xs font-semibold"
          style={{ color: props.accent }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

function TypingDots(props: { color: string }) {
  return (
    <span className="dentchat-typing" style={{ color: props.color }} aria-label="Typing">
      <i />
      <i />
      <i />
    </span>
  );
}

export function ChatWidget(props: {
  widgetKey: string;
  clinicName: string;
  accent: string;
  panel: string;
  buttonText: string;
  avatarName: string;
  avatarImageUrl: string;
  greetings: string[];
  options: Option[];
  phone: string;
  bookingUrl: string;
  startOpen?: boolean;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(props.startOpen));
  const [view, setView] = useState<View>("home");
  const [inquiry, setInquiry] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seqKey, setSeqKey] = useState(0);
  const [introDone, setIntroDone] = useState(false);

  const accent = props.accent || "#e0569f";
  const panel = props.panel || "#ffffff";
  const buttonText = props.buttonText || "#1a1a1a";
  const avatarLabel = props.avatarName || props.clinicName;
  const greetings = useMemo(
    () => (props.greetings || []).map((g) => g.trim()).filter(Boolean),
    [props.greetings],
  );
  const playIntro = open && view === "home" && !introDone;
  const introMs = greetings.length * 1000 + 500;

  useEffect(() => {
    notifyParent(open ? "open" : "close");
  }, [open]);

  useEffect(() => {
    if (!open) {
      setIntroDone(false);
      return;
    }
    if (!playIntro) return;
    const id = window.setTimeout(() => setIntroDone(true), introMs);
    return () => window.clearTimeout(id);
  }, [open, playIntro, introMs, seqKey]);

  const previewStyle = useMemo(() => {
    if (!props.preview) return undefined;
    return {
      background: "linear-gradient(180deg, #f8f4ee 0%, #eef3f5 48%, #e7eee9 100%)",
    };
  }, [props.preview]);

  function reset() {
    setView("home");
    setInquiry("");
    setName("");
    setEmail("");
    setPhone("");
    setConversationId(null);
    setMessages([]);
    setDraft("");
    setError("");
    setBusy(false);
    setIntroDone(false);
    setSeqKey((k) => k + 1);
  }

  function close() {
    notifyParent("close");
    setOpen(false);
  }

  function openChat() {
    notifyParent("open");
    setOpen(true);
  }

  function onAction(option: Option) {
    setError("");
    if (option.actionType === "book") {
      const href = (option.url || props.bookingUrl || "").trim();
      if (!href) {
        setError("Booking is not set up yet. Add a Dentally link in chatbot settings.");
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    if (option.actionType === "call") {
      const href = telHref(props.phone);
      if (!href) {
        setError("No practice number is set. Add a phone number in chatbot settings.");
        return;
      }
      window.open(href);
      return;
    }
    setInquiry(option.starterMessage || option.label);
    setIntroDone(true);
    setView("lead");
  }

  async function startLead(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/widget/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgetKey: props.widgetKey,
        name,
        email,
        phone,
        inquiry,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not start chat");
      return;
    }
    setConversationId(json.conversationId);
    setMessages([
      { role: "user", content: inquiry },
      { role: "assistant", content: json.reply },
    ]);
    setView("chat");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!conversationId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { role: "user", content }]);
    setBusy(true);
    const res = await fetch("/api/widget/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey: props.widgetKey, conversationId, content }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Send failed");
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: json.reply }]);
  }

  const headerPad = {
    paddingTop: "max(0.7rem, env(safe-area-inset-top, 0px))",
    paddingLeft: "max(0.85rem, env(safe-area-inset-left, 0px))",
    paddingRight: "max(0.85rem, env(safe-area-inset-right, 0px))",
  };

  return (
    <div
      data-widget-root
      className="relative h-full max-h-full min-h-0 w-full overflow-hidden bg-transparent"
      style={previewStyle}
    >
      {open ? (
        <div className="flex h-full max-h-full min-h-0 justify-end bg-transparent">
          <div
            className="dentchat-panel relative flex h-full max-h-full min-h-0 w-full max-w-[420px] flex-col"
            style={
              props.preview
                ? undefined
                : {
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.14) 28%, rgba(0,0,0,0.26) 100%)",
                  }
            }
          >
            <header
              className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 pb-2"
              style={headerPad}
            >
              <div
                className="inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1 shadow-sm"
                style={{ background: panel }}
              >
                <Avatar src={props.avatarImageUrl} name={avatarLabel} accent={accent} size={28} />
                <span className="truncate pr-2 text-sm font-semibold" style={{ color: buttonText }}>
                  {props.clinicName}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Reset chat"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
                  style={{ color: accent }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 12a9 9 0 1 1-3.2-6.8" strokeLinecap="round" />
                    <path d="M21 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close chat"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
                  style={{ color: buttonText }}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </header>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pr-3"
              style={{
                paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
                paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
              }}
            >
              {view === "home" ? (
                <div key={seqKey}>
                  <div className="space-y-3">
                    {greetings.map((greeting, i) => (
                      <div key={`${i}-${greeting.slice(0, 24)}`} className="grid">
                        {playIntro ? (
                          <div
                            className="dentchat-seq-typing col-start-1 row-start-1 flex items-end gap-2"
                            style={{ animationDelay: `${i * 1}s` }}
                            aria-hidden
                          >
                            <Avatar src={props.avatarImageUrl} name={avatarLabel} accent={accent} size={36} />
                            <div className="rounded-2xl px-3.5 py-2.5 shadow-sm" style={{ background: panel }}>
                              <TypingDots color={accent} />
                            </div>
                          </div>
                        ) : null}
                        <div
                          className={`col-start-1 row-start-1 flex items-end gap-2 ${playIntro ? "dentchat-seq-bubble" : ""}`}
                          style={playIntro ? { animationDelay: `${i * 1 + 0.38}s` } : undefined}
                        >
                          <Avatar src={props.avatarImageUrl} name={avatarLabel} accent={accent} size={36} />
                          <div
                            className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm"
                            style={{ background: panel, color: buttonText }}
                          >
                            {greeting}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`mt-5 rounded-[1.35rem] p-2.5 shadow-lg ${playIntro ? "dentchat-seq-bubble" : ""}`}
                    style={{
                      background: panel,
                      ...(playIntro ? { animationDelay: `${greetings.length * 1 + 0.2}s` } : {}),
                    }}
                  >
                    <div className="grid grid-cols-2 gap-2.5">
                      {props.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onAction(option)}
                          className="min-h-[3.4rem] rounded-xl px-2 py-3 text-center text-[13px] font-medium leading-snug"
                          style={{
                            background: panel,
                            color: buttonText,
                            boxShadow: "0 1px 3px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.04)",
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {view === "lead" ? (
                <form onSubmit={startLead} className="mt-1 space-y-3 rounded-[1.35rem] p-4 shadow-lg" style={{ background: panel }}>
                  <p className="text-sm font-semibold" style={{ color: buttonText }}>
                    Leave your details and we’ll help with your enquiry.
                  </p>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                  <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
                  <textarea required rows={3} value={inquiry} onChange={(e) => setInquiry(e.target.value)} placeholder="Your enquiry" />
                  <div className="flex gap-2">
                    <button type="button" className="btn secondary flex-1" onClick={() => setView("home")}>
                      Back
                    </button>
                    <button className="btn flex-1" style={{ background: accent }} disabled={busy}>
                      {busy ? "Starting…" : "Start chat"}
                    </button>
                  </div>
                </form>
              ) : null}

              {view === "chat" ? (
                <div className="mt-1 flex min-h-[12rem] flex-col rounded-[1.35rem] p-3 shadow-lg" style={{ background: panel }}>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[90%] rounded-2xl px-3 py-2 ${m.role === "user" ? "ml-auto text-white" : ""}`}
                        style={m.role === "user" ? { background: accent } : { background: "#f3f4f6", color: buttonText }}
                      >
                        {m.content}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={send} className="mt-3 flex gap-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" />
                    <button className="btn" style={{ background: accent }} disabled={busy}>
                      Send
                    </button>
                  </form>
                </div>
              ) : null}

              {error ? (
                <p className="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm text-red-700 shadow">{error}</p>
              ) : null}
            </div>

            <div
              className="flex shrink-0 items-center justify-end px-4 pt-2"
              style={{
                paddingBottom: "max(0.65rem, env(safe-area-inset-bottom, 0px))",
                paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
              }}
            >
              <div
                className="rounded-full px-3 py-1.5 text-xs font-semibold shadow-md"
                style={{ background: panel, color: accent }}
              >
                ⚡ By DentChat
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex h-full max-h-full items-end justify-end"
          style={{
            padding: "0.5rem",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
            paddingRight: "max(0.5rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
            style={{ background: accent }}
            onClick={openChat}
            aria-label="Open chat"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="M21 12a8.5 8.5 0 0 1-8.5 8.5H7l-4 3V12A8.5 8.5 0 1 1 21 12Z"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
