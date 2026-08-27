"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ChatbotActionType, WidgetFont, WidgetStyle } from "@/lib/types";
import { fontStack } from "@/lib/widget-appearance";
import { WidgetSkins } from "./widget-skins";

export type Option = {
  id: string;
  label: string;
  starterMessage: string;
  actionType: ChatbotActionType;
  url: string;
};

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type View = "home" | "lead" | "chat";

export type ChatWidgetProps = {
  widgetKey: string;
  clinicName: string;
  widgetStyle: WidgetStyle;
  fontFamily: WidgetFont;
  accent: string;
  panel: string;
  buttonText: string;
  surface: string;
  userBubble: string;
  assistantBubble: string;
  launcher: string;
  avatarName: string;
  avatarImageUrl: string;
  greetings: string[];
  options: Option[];
  phone: string;
  bookingUrl: string;
  startOpen?: boolean;
  preview?: boolean;
};

export type WidgetController = ChatWidgetProps & {
  open: boolean;
  view: View;
  inquiry: string;
  name: string;
  email: string;
  visitorPhone: string;
  messages: ChatMsg[];
  draft: string;
  error: string;
  busy: boolean;
  seqKey: number;
  introDone: boolean;
  playIntro: boolean;
  avatarLabel: string;
  fontCss: string;
  setInquiry: (v: string) => void;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setVisitorPhone: (v: string) => void;
  setDraft: (v: string) => void;
  setView: (v: View) => void;
  reset: () => void;
  close: () => void;
  openChat: () => void;
  onAction: (option: Option) => void;
  startLead: (e: FormEvent) => Promise<void>;
  send: (e: FormEvent) => Promise<void>;
};

function telHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function notifyParent(type: "open" | "close") {
  if (typeof window === "undefined") return;
  window.parent.postMessage({ source: "dentchat", type }, "*");
}

async function readApiJson(res: Response): Promise<{ error?: string; conversationId?: string; reply?: string }> {
  const text = await res.text();
  if (!text) return { error: res.ok ? "Empty response" : "Could not start chat" };
  try {
    return JSON.parse(text) as { error?: string; conversationId?: string; reply?: string };
  } catch {
    return { error: "Could not start chat" };
  }
}

export function Avatar(props: { src: string; name: string; accent: string; size: number }) {
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

export function TypingDots(props: { color: string }) {
  return (
    <span className="dentchat-typing" style={{ color: props.color }} aria-label="Typing">
      <i />
      <i />
      <i />
    </span>
  );
}

export function ChatWidget(props: ChatWidgetProps) {
  const [open, setOpen] = useState(Boolean(props.startOpen));
  const [view, setView] = useState<View>("home");
  const [inquiry, setInquiry] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seqKey, setSeqKey] = useState(0);
  const [introDone, setIntroDone] = useState(false);

  const greetings = useMemo(
    () => (props.greetings || []).map((g) => g.trim()).filter(Boolean),
    [props.greetings],
  );
  const playIntro = open && view === "home" && !introDone;
  const introMs = greetings.length * 1000 + 500;
  const avatarLabel = props.avatarName || props.clinicName;

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

  function reset() {
    setView("home");
    setInquiry("");
    setName("");
    setEmail("");
    setVisitorPhone("");
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

  async function startLead(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/widget/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetKey: props.widgetKey,
          name,
          email,
          phone: visitorPhone,
          inquiry,
        }),
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        setError(json.error || "Could not start chat");
        return;
      }
      setConversationId(json.conversationId || null);
      setMessages([
        { role: "user", content: inquiry },
        { role: "assistant", content: json.reply || "" },
      ]);
      setView("chat");
    } catch {
      setError("Could not start chat");
    } finally {
      setBusy(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!conversationId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { role: "user", content }]);
    setBusy(true);
    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey: props.widgetKey, conversationId, content }),
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        setError(json.error || "Send failed");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: json.reply || "" }]);
    } catch {
      setError("Send failed");
    } finally {
      setBusy(false);
    }
  }

  const ctrl: WidgetController = {
    ...props,
    open,
    view,
    inquiry,
    name,
    email,
    visitorPhone,
    messages,
    draft,
    error,
    busy,
    seqKey,
    introDone,
    playIntro,
    avatarLabel,
    fontCss: fontStack(props.fontFamily),
    setInquiry,
    setName,
    setEmail,
    setVisitorPhone,
    setDraft,
    setView,
    reset,
    close,
    openChat,
    onAction,
    startLead,
    send,
  };

  return <WidgetSkins ctrl={ctrl} />;
}
