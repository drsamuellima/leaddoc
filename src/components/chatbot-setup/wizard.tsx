"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Chatbot, ChatbotOption, KnowledgeItem, SetupChecklist, SetupExtract, SetupFaqDraft, SetupStep } from "@/lib/types";
import { SETUP_STEPS } from "@/lib/types";
import { checklistScore, emptyExtract, ensureSetup } from "@/lib/chatbot-setup";

type Payload = {
  bot: Chatbot;
  options: ChatbotOption[];
  faqs: KnowledgeItem[];
  checklist: SetupChecklist;
  score: { done: number; total: number; percent: number };
  error?: string;
};

const CHECK_LABELS: { key: keyof SetupChecklist; label: string }[] = [
  { key: "website", label: "Website scanned" },
  { key: "knowledge", label: "Knowledge approved" },
  { key: "name", label: "Practice name" },
  { key: "phone", label: "Phone" },
  { key: "booking", label: "Booking link" },
  { key: "greetings", label: "Greetings" },
  { key: "treatments", label: "Treatment buttons" },
  { key: "prompt", label: "System prompt" },
];

function canOpen(step: SetupStep, bot: Chatbot) {
  const setup = ensureSetup(bot);
  if (step === "website") return true;
  if (step === "knowledge") return setup.scanStatus === "ready" || setup.checklist.website;
  if (step === "interview" || step === "booking" || step === "live") return setup.checklist.knowledge;
  return false;
}

async function readPayload(res: Response): Promise<Payload> {
  const json = (await res.json()) as Payload & { error?: string };
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

export function ChatbotSetupWizard(props: { initial: Payload; snippet: string }) {
  const [payload, setPayload] = useState(props.initial);
  const [url, setUrl] = useState(ensureSetup(props.initial.bot).websiteUrl);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState(ensureSetup(props.initial.bot).scanError);
  const [faqs, setFaqs] = useState<SetupFaqDraft[]>(ensureSetup(props.initial.bot).pendingExtract?.faqs || []);
  const [draft, setDraft] = useState({
    name: props.initial.bot.name === "New chatbot" ? "" : props.initial.bot.name,
    phone: props.initial.bot.phone || "",
    bookingUrl: props.initial.bot.bookingUrl || "",
  });
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveHint, setSaveHint] = useState("Saved as you go");
  const faqTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedInterview = useRef(false);

  const bot = payload.bot;
  const setup = ensureSetup(bot);
  const step = setup.step;
  const score = payload.score || checklistScore(payload.checklist);
  const extract: SetupExtract = setup.pendingExtract || emptyExtract();

  useEffect(() => {
    setFaqs(ensureSetup(payload.bot).pendingExtract?.faqs || []);
  }, [payload.bot.setup?.pendingExtract]);

  function applyPayload(next: Payload) {
    setPayload(next);
    const nextSetup = ensureSetup(next.bot);
    setScanError(nextSetup.scanError);
    if (next.bot.phone) setDraft((d) => ({ ...d, phone: next.bot.phone }));
    if (next.bot.bookingUrl) setDraft((d) => ({ ...d, bookingUrl: next.bot.bookingUrl }));
    if (next.bot.name && next.bot.name !== "New chatbot") setDraft((d) => ({ ...d, name: next.bot.name }));
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/chatbots/${bot.id}/setup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const next = await readPayload(res);
    applyPayload(next);
    setSaveHint("Saved");
    return next;
  }

  async function openStep(next: SetupStep) {
    if (!canOpen(next, bot)) return;
    await patch({ step: next });
  }

  async function scan() {
    setScanBusy(true);
    setScanError("");
    try {
      const res = await fetch(`/api/chatbots/${bot.id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const next = await readPayload(res);
      applyPayload(next);
      setFaqs(ensureSetup(next.bot).pendingExtract?.faqs || []);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanBusy(false);
    }
  }

  function queueFaqSave(nextFaqs: SetupFaqDraft[]) {
    setFaqs(nextFaqs);
    if (faqTimer.current) clearTimeout(faqTimer.current);
    faqTimer.current = setTimeout(() => {
      void patch({ pendingFaqs: nextFaqs });
    }, 500);
  }

  function queueFields(next: typeof draft) {
    setDraft(next);
    if (fieldTimer.current) clearTimeout(fieldTimer.current);
    fieldTimer.current = setTimeout(() => {
      void patch({ name: next.name, phone: next.phone, bookingUrl: next.bookingUrl });
    }, 450);
  }

  async function approve() {
    await patch({ pendingFaqs: faqs, approveKnowledge: true, name: draft.name, phone: draft.phone, bookingUrl: draft.bookingUrl });
  }

  async function sendChat(start = false) {
    if (chatBusy) return;
    if (!start && !chatInput.trim()) return;
    setChatBusy(true);
    try {
      const res = await fetch(`/api/chatbots/${bot.id}/setup-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, message: start ? "" : chatInput }),
      });
      const next = await readPayload(res);
      applyPayload(next);
      if (!start) setChatInput("");
    } finally {
      setChatBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "interview") return;
    if (startedInterview.current) return;
    if (setup.interview.length) {
      startedInterview.current = true;
      return;
    }
    startedInterview.current = true;
    void sendChat(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, setup.interview.length]);

  async function goLive() {
    const next = await patch({
      goLive: true,
      name: draft.name,
      phone: draft.phone,
      bookingUrl: draft.bookingUrl,
    });
    window.location.href = `/app/chatbots/${next.bot.id}`;
  }

  const missing = useMemo(
    () => CHECK_LABELS.filter((row) => !payload.checklist[row.key]).map((row) => row.label),
    [payload.checklist],
  );

  return (
    <div className="setup-shell">
      <div className="setup-progress-wrap">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="setup-kicker">Setup</p>
            <h1 className="setup-title">{draft.name || "Your chatbot"}</h1>
            <p className="setup-lede">We’ll scan the site, you approve the knowledge, then a few short questions. Everything saves as you go.</p>
          </div>
          <div className="text-right">
            <div className="setup-percent">{score.percent}%</div>
            <div className="setup-saved">{saveHint}</div>
          </div>
        </div>
        <div className="setup-bar" aria-label="Setup progress">
          <span style={{ width: `${score.percent}%` }} />
        </div>
        <ul className="setup-checks">
          {CHECK_LABELS.map((row) => (
            <li key={row.key} className={payload.checklist[row.key] ? "done" : ""}>
              <span />
              {row.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="setup-cards">
        {SETUP_STEPS.map((card) => {
          const open = canOpen(card.id, bot);
          const active = step === card.id;
          const done =
            (card.id === "website" && payload.checklist.website) ||
            (card.id === "knowledge" && payload.checklist.knowledge) ||
            (card.id === "interview" && payload.checklist.name && payload.checklist.prompt) ||
            (card.id === "booking" && payload.checklist.booking && payload.checklist.phone) ||
            (card.id === "live" && bot.setupComplete);
          return (
            <button
              key={card.id}
              type="button"
              className={`setup-nav-card ${active ? "active" : ""} ${done ? "is-done" : ""} ${open ? "" : "locked"}`}
              disabled={!open}
              onClick={() => void openStep(card.id)}
            >
              <strong>{card.title}</strong>
              <span>{card.blurb}</span>
            </button>
          );
        })}
      </div>

      {step === "website" && (
        <section className="setup-panel">
          <h2>Paste your practice website</h2>
          <p>We’ll read the homepage and a few linked pages such as About, Contact, Treatments, and Hours.</p>
          <label className="setup-label">
            Website
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourpractice.co.uk"
              autoComplete="url"
            />
          </label>
          {scanError ? <p className="setup-error">{scanError}</p> : null}
          {extract.pages.length ? (
            <p className="setup-note">Last scan: {extract.pages.length} page{extract.pages.length === 1 ? "" : "s"}.</p>
          ) : null}
          <button className="btn" type="button" onClick={() => void scan()} disabled={scanBusy || !url.trim()}>
            {scanBusy ? "Scanning…" : "Scan website"}
          </button>
        </section>
      )}

      {step === "knowledge" && (
        <section className="setup-panel">
          <h2>Review what we found</h2>
          <p>Edit anything that looks off. Approving adds these answers to the chat.</p>
          <div className="setup-found">
            <label className="setup-label">
              Practice name
              <input value={draft.name} onChange={(e) => queueFields({ ...draft, name: e.target.value })} placeholder="Bright Smile Dental" />
            </label>
            <label className="setup-label">
              Phone
              <input value={draft.phone} onChange={(e) => queueFields({ ...draft, phone: e.target.value })} placeholder="020 7946 0123" />
            </label>
            <label className="setup-label">
              Booking link
              <input value={draft.bookingUrl} onChange={(e) => queueFields({ ...draft, bookingUrl: e.target.value })} placeholder="https://…dentally…" />
            </label>
          </div>
          <div className="setup-faq-list">
            {faqs.map((faq, i) => (
              <article key={`${i}-${faq.title}`} className="setup-faq">
                <input
                  value={faq.title}
                  onChange={(e) => queueFaqSave(faqs.map((row, idx) => (idx === i ? { ...row, title: e.target.value } : row)))}
                  placeholder="Title"
                />
                <input
                  value={faq.question}
                  onChange={(e) => queueFaqSave(faqs.map((row, idx) => (idx === i ? { ...row, question: e.target.value } : row)))}
                  placeholder="Question patients ask"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => queueFaqSave(faqs.map((row, idx) => (idx === i ? { ...row, answer: e.target.value } : row)))}
                  placeholder="Answer"
                  rows={3}
                />
                <button
                  type="button"
                  className="btn secondary tiny"
                  onClick={() => queueFaqSave(faqs.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn secondary"
              onClick={() => queueFaqSave([...faqs, { title: "FAQ", question: "", answer: "" }])}
            >
              Add FAQ
            </button>
            <button type="button" className="btn" onClick={() => void approve()}>
              Approve knowledge
            </button>
          </div>
        </section>
      )}

      {step === "interview" && (
        <section className="setup-panel setup-chat-panel">
          <h2>A few questions</h2>
          <p>Answer in your own words. We’ll fill the chatbot as you go.</p>
          <div className="setup-thread">
            {setup.interview.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`setup-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {chatBusy ? <div className="setup-bubble assistant muted">Thinking…</div> : null}
          </div>
          <form
            className="setup-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void sendChat(false);
            }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a reply"
              disabled={chatBusy}
            />
            <button className="btn" type="submit" disabled={chatBusy || !chatInput.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      {step === "booking" && (
        <section className="setup-panel">
          <h2>Booking and phone</h2>
          <p>Paste your Dentally (or other) booking page, and the number Call buttons should dial.</p>
          <label className="setup-label">
            Booking URL
            <input
              value={draft.bookingUrl}
              onChange={(e) => queueFields({ ...draft, bookingUrl: e.target.value })}
              placeholder="https://yourpractice.dently.app/book"
            />
          </label>
          <label className="setup-label">
            Practice phone
            <input
              value={draft.phone}
              onChange={(e) => queueFields({ ...draft, phone: e.target.value })}
              placeholder="020 7946 0123"
            />
          </label>
          <button type="button" className="btn" onClick={() => void openStep("live")}>
            Continue
          </button>
        </section>
      )}

      {step === "live" && (
        <section className="setup-panel">
          <h2>Go live</h2>
          <p>This turns the widget on and opens the studio if you want to tweak skins later.</p>
          {missing.length ? (
            <p className="setup-note">Still missing: {missing.join(", ")}. You can go live anyway and finish in the studio.</p>
          ) : (
            <p className="setup-note">Everything on the list is filled in.</p>
          )}
          <pre className="setup-snippet">{props.snippet}</pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                void navigator.clipboard.writeText(props.snippet);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy snippet"}
            </button>
            <button type="button" className="btn" onClick={() => void goLive()}>
              Activate and open studio
            </button>
          </div>
        </section>
      )}

      <p className="setup-foot">
        <Link href="/app/chatbots">Back to chatbots</Link>
      </p>
    </div>
  );
}
