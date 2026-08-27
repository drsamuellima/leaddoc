"use client";

import { useEffect, useState } from "react";

const script: { role: "ai" | "user"; text: string }[] = [
  { role: "ai", text: "Good evening — I’m Linda from EA Dental Specialists. How can I help?" },
  { role: "user", text: "Do you do Invisalign, and can I book after work?" },
  {
    role: "ai",
    text: "Yes. We plan Invisalign here, and I can take your enquiry now even after hours. The team confirms a consult in the morning.",
  },
  { role: "user", text: "Great — whitening prices too, please." },
  {
    role: "ai",
    text: "I can share the range and capture your details so reception follows up. No clinical diagnosis in chat — just a faster first step.",
  },
];

export function HeroChat() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= script.length + 1) {
      const reset = window.setTimeout(() => setVisible(0), 2400);
      return () => window.clearTimeout(reset);
    }
    const id = window.setTimeout(() => setVisible((n) => n + 1), visible === 0 ? 400 : 1100);
    return () => window.clearTimeout(id);
  }, [visible]);

  const showChips = visible >= script.length;

  return (
    <div className="mkt-chat">
      <div className="mkt-chat-head">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d8ff6e] text-xs font-bold text-black">L</span>
          <div>
            <div className="text-sm font-semibold">Linda · LeadDoc</div>
            <div className="text-[11px] text-[#6a6a64]">AI receptionist · replies in seconds</div>
          </div>
        </div>
        <span className="rounded-full bg-[#d8ff6e] px-2 py-1 text-[11px] font-semibold text-[#14382c]">Live demo</span>
      </div>
      <div className="mkt-chat-body">
        {script.slice(0, visible).map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`mkt-bubble ${msg.role}`} style={{ animationDelay: "0s" }}>
            {msg.text}
          </div>
        ))}
        {visible < script.length ? (
          <div className="mkt-bubble ai" aria-label="Typing">
            <span className="dentchat-typing" style={{ color: "#14382c" }}>
              <i />
              <i />
              <i />
            </span>
          </div>
        ) : null}
        {showChips ? (
          <div className="mkt-chips">
            {["Book a consult", "Teeth whitening", "Emergency", "Invisalign"].map((chip, i) => (
              <span key={chip} style={{ animationDelay: `${i * 80}ms` }}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mkt-composer">
        Ask about treatments, hours, or booking…
        <span className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-[#d8ff6e] text-black">↑</span>
      </div>
    </div>
  );
}
