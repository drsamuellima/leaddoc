"use client";

import { useMemo, useState } from "react";

type Option = { id: string; label: string; starterMessage: string };
type ChatMsg = { role: "user" | "assistant"; content: string };

export function ChatWidget(props: {
  widgetKey: string;
  clinicName: string;
  color: string;
  logoUrl: string;
  welcomeImageUrl: string;
  greeting: string;
  options: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [inquiry, setInquiry] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const style = useMemo(() => ({ background: props.color }), [props.color]);

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

  return (
    <div data-widget-root className="flex h-screen flex-col items-end justify-end bg-transparent p-4">
      {open ? (
        <div className="mb-3 flex h-[580px] w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 text-white" style={style}>
            {props.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="truncate font-semibold">{props.clinicName}</div>
              <div className="text-xs opacity-80">Usually replies instantly</div>
            </div>
            <button className="ml-auto text-white" onClick={() => setOpen(false)} type="button">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {props.welcomeImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.welcomeImageUrl} alt="" className="h-28 w-full rounded-lg object-cover" />
            ) : null}
            <p>{props.greeting}</p>
            {!conversationId ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {props.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{ borderColor: props.color, color: props.color }}
                      onClick={() => setInquiry(o.starterMessage)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={startLead} className="space-y-2">
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                  <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
                  <textarea required rows={3} value={inquiry} onChange={(e) => setInquiry(e.target.value)} placeholder="Your enquiry" />
                  {error ? <p className="text-red-700">{error}</p> : null}
                  <button className="btn w-full" style={style} disabled={busy}>
                    Start chat
                  </button>
                </form>
              </>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[90%] rounded-xl px-3 py-2 ${m.role === "user" ? "ml-auto bg-slate-100" : "text-white"}`}
                    style={m.role === "assistant" ? style : undefined}
                  >
                    {m.content}
                  </div>
                ))}
                <form onSubmit={send} className="flex gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" />
                  <button className="btn" style={style} disabled={busy}>
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className="h-14 w-14 rounded-full text-2xl text-white shadow-lg"
        style={style}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
      >
        💬
      </button>
    </div>
  );
}
