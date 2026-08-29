"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Chatbot, ChatbotOption, KnowledgeItem, SetupChecklist, SetupConfirmField, SetupExtract, SetupFaqDraft, SetupStep, SetupTreatmentDraft } from "@/lib/types";
import { SETUP_STEPS, parseActionType } from "@/lib/types";
import { checklistScore, emptyExtract, ensureSetup } from "@/lib/chatbot-setup";
import { DeleteChatbotButton } from "@/components/chatbot-studio/delete-chatbot-button";

type Payload = {
  bot: Chatbot;
  options: ChatbotOption[];
  faqs: KnowledgeItem[];
  checklist: SetupChecklist;
  score: { done: number; total: number; percent: number };
  aiEnabled?: boolean;
  error?: string;
  advanceToBooking?: boolean;
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

const ACTION_CHOICES: { id: "lead" | "book" | "call"; label: string }[] = [
  { id: "lead", label: "Chat" },
  { id: "book", label: "Book" },
  { id: "call", label: "Call" },
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
  const [treatments, setTreatments] = useState<SetupTreatmentDraft[]>(ensureSetup(props.initial.bot).pendingExtract?.treatments || []);
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
  const treatmentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedInterview = useRef(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bot = payload.bot;
  const setup = ensureSetup(bot);
  const step = setup.step;
  const score = payload.score || checklistScore(payload.checklist);
  const extract: SetupExtract = setup.pendingExtract || emptyExtract();

  useEffect(() => {
    const pending = ensureSetup(payload.bot).pendingExtract;
    setFaqs(pending?.faqs || []);
    setTreatments(pending?.treatments || []);
  }, [payload.bot.setup?.pendingExtract]);

  function applyPayload(next: Payload, fromScan = false, syncDraft = false) {
    setPayload(next);
    const nextSetup = ensureSetup(next.bot);
    setScanError(nextSetup.scanError);
    const extract = nextSetup.pendingExtract;
    if (fromScan && extract) {
      setDraft({
        name: extract.name.trim(),
        phone: extract.phone.trim(),
        bookingUrl: extract.bookingUrl.trim(),
      });
      return;
    }
    if (syncDraft) {
      setDraft({
        name: next.bot.name === "New chatbot" ? "" : next.bot.name,
        phone: next.bot.phone || "",
        bookingUrl: next.bot.bookingUrl || "",
      });
      return;
    }
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
      applyPayload(next, true);
      const pending = ensureSetup(next.bot).pendingExtract;
      setFaqs(pending?.faqs || []);
      setTreatments(pending?.treatments || []);
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

  function queueTreatmentSave(nextTreatments: SetupTreatmentDraft[]) {
    setTreatments(nextTreatments);
    if (treatmentTimer.current) clearTimeout(treatmentTimer.current);
    treatmentTimer.current = setTimeout(() => {
      void patch({ pendingTreatments: nextTreatments });
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
    await patch({
      pendingFaqs: faqs,
      pendingTreatments: treatments,
      approveKnowledge: true,
      name: draft.name,
      phone: draft.phone,
      bookingUrl: draft.bookingUrl,
    });
  }

  function queueAdvanceToBooking() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      void patch({ step: "booking" });
    }, 1100);
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
      applyPayload(next, false, true);
      if (!start) setChatInput("");
      if (next.advanceToBooking) queueAdvanceToBooking();
    } finally {
      setChatBusy(false);
    }
  }

  async function sendConfirm(field: SetupConfirmField, accepted: boolean) {
    if (chatBusy) return;
    setChatBusy(true);
    try {
      const res = await fetch(`/api/chatbots/${bot.id}/setup-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: { field, accepted } }),
      });
      const next = await readPayload(res);
      applyPayload(next, false, true);
      if (next.advanceToBooking) queueAdvanceToBooking();
    } finally {
      setChatBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "interview") {
      startedInterview.current = false;
      return;
    }
    if (setup.interview.length) {
      startedInterview.current = true;
      return;
    }
    startedInterview.current = true;
    void sendChat(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, setup.interview.length]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [setup.interview.length, chatBusy]);

  async function goLive() {
    await patch({
      goLive: true,
      name: draft.name,
      phone: draft.phone,
      bookingUrl: draft.bookingUrl,
    });
    window.location.href = `/app`;
  }

  async function enterClinic() {
    await patch({
      enterClinic: true,
      name: draft.name,
    });
    window.location.href = `/app`;
  }

  const missing = useMemo(
    () => CHECK_LABELS.filter((row) => !payload.checklist[row.key]).map((row) => row.label),
    [payload.checklist],
  );
  const siteFaqs = faqs.map((faq, i) => ({ faq, i })).filter((row) => row.faq.source !== "suggested");
  const suggestedFaqs = faqs.map((faq, i) => ({ faq, i })).filter((row) => row.faq.source === "suggested");
  const foundCount = [draft.name, draft.phone, draft.bookingUrl].filter((value) => value.trim()).length;

  return (
    <div className="setup-shell">
      <div className="setup-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {!payload.aiEnabled ? (
        <p className="setup-warn">
          AI is off. Add <code>GEMINI_API_KEY</code> to <code>.env.local</code> (copy from <code>.env.example</code>) and restart{" "}
          <code>npm run dev</code>. Until then, scan uses the pages we can fetch plus starter FAQs, and the interview uses a script.
        </p>
      ) : null}
      <div className="setup-progress-wrap">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="setup-kicker">Clinic Sign Up</p>
            <h1 className="setup-title">{draft.name || "Your clinic"}</h1>
            <p className="setup-lede">Scan the practice website so we can fill the chat. Everything saves as you go.</p>
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
        {SETUP_STEPS.map((card, i) => {
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
              style={{ animationDelay: `${i * 55}ms` }}
              disabled={!open}
              onClick={() => void openStep(card.id)}
            >
              <em>{String(i + 1).padStart(2, "0")}</em>
              <strong>{card.title}</strong>
              <span>{card.blurb}</span>
            </button>
          );
        })}
      </div>

      {step === "website" && (
        <section key="website" className={`setup-panel ${scanBusy ? "is-scanning" : ""}`}>
          <div className="setup-review-hero">
            <div>
              <h2>Website scan</h2>
              <p>We’ll read the homepage and a few linked pages such as About, Contact, Treatments, and Hours.</p>
            </div>
            <div className="setup-review-stats" aria-label="Scan status">
              <div>
                <strong>{extract.pages.length || "—"}</strong>
                <span>{extract.pages.length === 1 ? "Page" : "Pages"}</span>
              </div>
            </div>
          </div>
          <section className="setup-block">
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
            ) : (
              <p className="setup-empty">Gemini reads the public site, then fills Review knowledge.</p>
            )}
          </section>
          <div className="setup-review-actions">
            <p>{scanBusy ? "Stay on this card — Gemini can take about 20 seconds, or up to a minute if the free-tier cap was just hit." : "Ready when you are."}</p>
            <button className="btn setup-scan-btn" type="button" onClick={() => void scan()} disabled={scanBusy || !url.trim()}>
              {scanBusy ? (
                <span className="setup-scan-label">
                  <i />
                  <i />
                  <i />
                  Reading the site
                </span>
              ) : (
                "Scan website"
              )}
            </button>
          </div>
        </section>
      )}

      {step === "knowledge" && (
        <section key="knowledge" className="setup-panel setup-review-panel">
          <div className="setup-review-hero">
            <div>
              <h2>Review what we found</h2>
              <p>Check the practice details, widget buttons, and answers. Edit anything that is off — then approve.</p>
            </div>
            <div className="setup-review-stats" aria-label="Scan summary">
              <div>
                <strong>{foundCount}/3</strong>
                <span>Practice fields</span>
              </div>
              <div>
                <strong>{treatments.length}</strong>
                <span>Services</span>
              </div>
              <div>
                <strong>{faqs.length}</strong>
                <span>Answers</span>
              </div>
            </div>
          </div>
          <div className="setup-pills">
            <span className={`setup-pill ${draft.name.trim() ? "ok" : "miss"}`}>{draft.name.trim() ? "Name found" : "Name needed"}</span>
            <span className={`setup-pill ${draft.phone.trim() ? "ok" : "miss"}`}>{draft.phone.trim() ? "Phone found" : "Phone needed"}</span>
            <span className={`setup-pill ${draft.bookingUrl.trim() ? "ok" : "miss"}`}>
              {draft.bookingUrl.trim() ? "Booking found" : "Booking needed"}
            </span>
          </div>

          <section className="setup-block">
            <header className="setup-block-head">
              <div>
                <h3>Practice</h3>
                <p>Copied from the website when we could see it. Leave blank if it was not there.</p>
              </div>
            </header>
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
          </section>

          <section className="setup-block">
            <header className="setup-block-head">
              <div>
                <h3>Services</h3>
                <p>These become treatment buttons on the widget.</p>
              </div>
              <button
                type="button"
                className="btn secondary tiny"
                onClick={() =>
                  queueTreatmentSave([...treatments, { label: "", actionType: "lead", starterMessage: "", url: "" }])
                }
              >
                Add service
              </button>
            </header>
            {treatments.length ? (
              <div className="setup-service-list">
                {treatments.map((item, i) => (
                  <article key={`svc-${i}`} className="setup-service" style={{ animationDelay: `${i * 40}ms` }}>
                    <input
                      value={item.label}
                      onChange={(e) =>
                        queueTreatmentSave(treatments.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))
                      }
                      placeholder="Service name"
                    />
                    <div className="setup-seg" role="group" aria-label="Button action">
                      {ACTION_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className={item.actionType === choice.id ? "on" : ""}
                          onClick={() =>
                            queueTreatmentSave(
                              treatments.map((row, idx) => (idx === i ? { ...row, actionType: parseActionType(choice.id) } : row)),
                            )
                          }
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="setup-remove"
                      onClick={() => queueTreatmentSave(treatments.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="setup-empty">No services on the pages we read. Add buttons if you want treatments on the widget.</p>
            )}
          </section>

          <section className="setup-block">
            <header className="setup-block-head">
              <div>
                <h3>From the website</h3>
                <p>Answers taken from the scanned pages.</p>
              </div>
              <span className="setup-count">{siteFaqs.length}</span>
            </header>
            {siteFaqs.length ? (
              <div className="setup-faq-list">
                {siteFaqs.map(({ faq, i }, n) => (
                  <article key={`site-${i}`} className="setup-faq" style={{ animationDelay: `${n * 45}ms` }}>
                    <div className="setup-faq-meta">
                      <span className="setup-faq-tag site">From the website</span>
                      <button type="button" className="setup-remove" onClick={() => queueFaqSave(faqs.filter((_, idx) => idx !== i))}>
                        Remove
                      </button>
                    </div>
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
                  </article>
                ))}
              </div>
            ) : (
              <p className="setup-empty">No site answers yet. Scan again or add a FAQ below.</p>
            )}
          </section>

          <section className="setup-block setup-block-suggest">
            <header className="setup-block-head">
              <div>
                <h3>Suggested extras</h3>
                <p>Useful questions the site did not cover. Remove anything that is not right.</p>
              </div>
              <button
                type="button"
                className="btn secondary tiny"
                onClick={() => queueFaqSave([...faqs, { title: "FAQ", question: "", answer: "", source: "suggested" }])}
              >
                Add FAQ
              </button>
            </header>
            {suggestedFaqs.length ? (
              <div className="setup-faq-list">
                {suggestedFaqs.map(({ faq, i }, n) => (
                  <article key={`sug-${i}`} className="setup-faq" style={{ animationDelay: `${n * 45}ms` }}>
                    <div className="setup-faq-meta">
                      <span className="setup-faq-tag suggested">Suggested</span>
                      <button type="button" className="setup-remove" onClick={() => queueFaqSave(faqs.filter((_, idx) => idx !== i))}>
                        Remove
                      </button>
                    </div>
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
                  </article>
                ))}
              </div>
            ) : (
              <p className="setup-empty">No suggestions. Add a FAQ if patients ask something extra.</p>
            )}
          </section>

          <div className="setup-review-actions">
            <p>Looks right? This writes the FAQs and service buttons onto the chatbot.</p>
            <button type="button" className="btn" onClick={() => void approve()}>
              Approve knowledge
            </button>
          </div>
        </section>
      )}

      {step === "interview" && (
        <section key="interview" className="setup-panel setup-chat-panel">
          <div className="setup-chat-orbs" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2>A few questions</h2>
          <p>We’ll flash what we already have — tick if it’s right, or cross it and type the real value. Then a couple of follow-ups for voice and hours.</p>
          <div className="setup-thread" ref={threadRef}>
            {setup.interview.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`setup-bubble ${msg.role} ${msg.confirm ? "has-confirm" : ""}`}>
                <p>{msg.content}</p>
                {msg.confirm ? (
                  <div className={`setup-confirm ${msg.confirm.status}`}>
                    <div className="setup-confirm-value">{msg.confirm.value}</div>
                    {msg.confirm.status === "pending" ? (
                      <div className="setup-confirm-actions">
                        <button
                          type="button"
                          className="setup-yes"
                          disabled={chatBusy}
                          aria-label="That's right"
                          onClick={() => void sendConfirm(msg.confirm!.field, true)}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="setup-no"
                          disabled={chatBusy}
                          aria-label="That's wrong"
                          onClick={() => void sendConfirm(msg.confirm!.field, false)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className={`setup-confirm-status ${msg.confirm.status}`}>
                        {msg.confirm.status === "accepted" ? "Locked in" : "We'll replace it"}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            {chatBusy ? (
              <div className="setup-bubble assistant setup-typing">
                <i />
                <i />
                <i />
              </div>
            ) : null}
          </div>
          {setup.interview.at(-1)?.confirm?.status === "pending" ? (
            <p className="setup-chat-hint">Tick or cross the last card — no need to type yet.</p>
          ) : (
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
                placeholder="Type a reply…"
                disabled={chatBusy}
              />
              <button className="btn" type="submit" disabled={chatBusy || !chatInput.trim()}>
                Send
              </button>
            </form>
          )}
        </section>
      )}

      {step === "booking" && (
        <section key="booking" className="setup-panel">
          <div className="setup-review-hero">
            <div>
              <h2>Booking and phone</h2>
              <p>Paste your Dentally (or other) booking page, and the number Call buttons should dial.</p>
            </div>
            <div className="setup-review-stats">
              <div>
                <strong>{draft.bookingUrl.trim() ? "On" : "—"}</strong>
                <span>Booking</span>
              </div>
              <div>
                <strong>{draft.phone.trim() ? "On" : "—"}</strong>
                <span>Phone</span>
              </div>
            </div>
          </div>
          <section className="setup-block">
            <div className="setup-found">
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
            </div>
          </section>
          <div className="setup-review-actions">
            <p>You can leave either field blank and finish it in the studio.</p>
            <button type="button" className="btn" onClick={() => void openStep("live")}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === "live" && (
        <section key="live" className="setup-panel">
          <div className="setup-review-hero">
            <div>
              <h2>Open clinic</h2>
              <p>Open your clinic workspace. Turn the widget on now, or activate it later from Chatbots.</p>
            </div>
            <div className="setup-review-stats">
              <div>
                <strong>{score.percent}%</strong>
                <span>Ready</span>
              </div>
            </div>
          </div>
          <section className="setup-block">
            {missing.length ? (
              <p className="setup-note">Still missing: {missing.join(", ")}. You can go live anyway and finish in the studio.</p>
            ) : (
              <p className="setup-note">Everything on the list is filled in.</p>
            )}
            <pre className="setup-snippet">{props.snippet}</pre>
          </section>
          <div className="setup-review-actions">
            <p>Copy the snippet now, or grab it again from the studio.</p>
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
              <button type="button" className="btn secondary" onClick={() => void enterClinic()}>
                Open clinic
              </button>
              <button type="button" className="btn" onClick={() => void goLive()}>
                Activate widget
              </button>
            </div>
          </div>
        </section>
      )}

      <p className="setup-foot">
        <Link href="/app/chatbots">Back to chatbots</Link>
        <DeleteChatbotButton id={bot.id} name={draft.name || bot.name} className="btn danger tiny" label="Delete draft" />
      </p>
    </div>
  );
}
