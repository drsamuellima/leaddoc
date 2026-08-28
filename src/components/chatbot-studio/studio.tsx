"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarCropField } from "@/components/avatar-crop-field";
import { DeleteChatbotButton } from "@/components/chatbot-studio/delete-chatbot-button";
import { StatusBadge } from "@/components/ui";
import { KNOWLEDGE_PACKS, knowledgeKey } from "@/lib/knowledge-examples";
import type { Chatbot, ChatbotOption, KnowledgeItem, Organization, WidgetFont, WidgetStyle } from "@/lib/types";
import {
  appearanceToQuery,
  COLOR_FIELDS,
  parseHexColor,
  WIDGET_FONT_META,
  WIDGET_STYLE_META,
  type AppearanceTokens,
} from "@/lib/widget-appearance";

const actionLabels = {
  lead: "Lead + AI chat",
  book: "Book (URL)",
  call: "Call practice",
} as const;

const tokenToField: Record<string, string> = {
  accent: "accentColor",
  panel: "panelColor",
  buttonText: "buttonTextColor",
  surface: "surfaceColor",
  userBubble: "userBubbleColor",
  assistantBubble: "assistantBubbleColor",
  launcher: "launcherColor",
};

function StyleThumb({
  id,
  accent,
  panel,
  surface,
  userBubble,
}: {
  id: WidgetStyle;
  accent: string;
  panel: string;
  surface: string;
  userBubble: string;
}) {
  return (
    <div className="studio-thumb" data-thumb={id} style={{ background: `linear-gradient(145deg, ${surface} 0%, ${panel} 55%, ${accent}33 100%)` }}>
      {id === "orbital" || id === "pulse" ? (
        <>
          <i style={{ left: 6, top: 8, width: 22, height: 8, background: panel }} />
          <i style={{ left: 6, top: 19, width: 28, height: 8, background: panel }} />
          <i style={{ right: 8, bottom: 6, width: 10, height: 10, borderRadius: 99, background: accent }} />
        </>
      ) : null}
      {id === "glass" ? (
        <>
          <i style={{ left: 8, top: 7, right: 8, height: 28, background: `${panel}cc`, borderRadius: 10 }} />
          <i style={{ left: 12, bottom: 6, width: 18, height: 7, borderRadius: 99, background: accent }} />
        </>
      ) : null}
      {id === "sheet" ? (
        <>
          <i style={{ left: 4, right: 4, bottom: 0, height: 30, background: panel, borderRadius: "10px 10px 0 0" }} />
          <i style={{ left: "42%", top: 16, width: 16, height: 3, background: "#0003" }} />
        </>
      ) : null}
      {id === "messenger" ? (
        <>
          <i style={{ inset: 0, background: `${accent}18` }} />
          <i style={{ left: 6, top: 6, right: 6, height: 8, background: panel }} />
          <i style={{ left: 6, top: 18, width: 20, height: 8, background: panel }} />
          <i style={{ right: 6, bottom: 6, width: 18, height: 8, background: userBubble }} />
        </>
      ) : null}
      {id === "dock" ? (
        <>
          <i style={{ right: 4, top: 4, bottom: 4, width: 22, background: panel, borderRadius: 6 }} />
          <i style={{ right: 8, top: 8, width: 8, height: 8, borderRadius: 99, background: accent }} />
        </>
      ) : null}
    </div>
  );
}

function ColorField(props: { label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  const [hex, setHex] = useState(props.value);
  useEffect(() => setHex(props.value), [props.value]);

  function commit(raw: string) {
    const next = parseHexColor(raw, props.value);
    setHex(next);
    props.onChange(next);
  }

  return (
    <div className="studio-color">
      <label>{props.label}</label>
      <div className="studio-color-row">
        <label className="studio-swatch" style={{ background: props.value }}>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(props.value) ? props.value : "#000000"}
            onChange={(e) => commit(e.target.value)}
            aria-label={props.label}
          />
        </label>
        <input
          type="text"
          value={hex}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            const raw = e.target.value;
            setHex(raw);
            if (/^#[0-9a-fA-F]{6}$/.test(raw)) props.onChange(raw.toLowerCase());
          }}
          onBlur={() => commit(hex)}
        />
      </div>
      <p className="hint">{props.hint}</p>
    </div>
  );
}

function KnowledgeEditor(props: {
  chatbotId: string;
  item?: KnowledgeItem;
  title: string;
  question: string;
  answer: string;
  submitLabel: string;
}) {
  const updating = Boolean(props.item);
  return (
    <div className="studio-knowledge">
      <form
        action={updating ? "/api/form/updateKnowledge" : "/api/form/addKnowledge"}
        method="post"
        className="studio-knowledge-fields"
      >
        <input type="hidden" name="chatbotId" value={props.chatbotId} />
        {props.item ? <input type="hidden" name="knowledgeId" value={props.item.id} /> : null}
        <input name="title" defaultValue={props.item?.title ?? props.title} required placeholder="Title" />
        <input name="question" defaultValue={props.item?.question ?? props.question} required placeholder="Question" />
        <textarea name="answer" rows={2} defaultValue={props.item?.answer ?? props.answer} required placeholder="Answer" />
        <button className="btn tiny" type="submit">
          {props.submitLabel}
        </button>
      </form>
      {props.item ? (
        <form action="/api/form/deleteKnowledge" method="post">
          <input type="hidden" name="chatbotId" value={props.chatbotId} />
          <input type="hidden" name="knowledgeId" value={props.item.id} />
          <button className="btn secondary tiny" type="submit">
            Remove
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function ChatbotStudio(props: {
  bot: Chatbot;
  org: Organization;
  options: ChatbotOption[];
  faqs: KnowledgeItem[];
  snippet: string;
  greetingsText: string;
  initial: AppearanceTokens;
  previewBase: string;
  saved?: boolean;
}) {
  const [tokens, setTokens] = useState<AppearanceTokens>(props.initial);
  const catalogKeys = useMemo(
    () => new Set(KNOWLEDGE_PACKS.flatMap((pack) => pack.items.map((item) => knowledgeKey(item)))),
    [],
  );
  const customFaqs = props.faqs.filter((faq) => !catalogKeys.has(knowledgeKey(faq)));
  const previewSrc = `${props.previewBase}&${appearanceToQuery(tokens)}`;

  function patch(partial: Partial<AppearanceTokens>) {
    setTokens((t) => ({ ...t, ...partial }));
  }

  function pickStyle(id: WidgetStyle) {
    const meta = WIDGET_STYLE_META.find((s) => s.id === id);
    if (!meta) return;
    patch({ widgetStyle: id, ...meta.suggested });
  }

  return (
    <div className="chatbot-studio">
      <div className="studio-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="studio-editor">
        {props.saved ? <p className="studio-flash">Saved. Preview uses live tokens until you reload after save.</p> : null}

        <form action="/api/form/saveChatbot" method="post" className="studio-form" id="studio-save-form">
          <div className="studio-savebar">
            <div>
              <strong>Studio</strong>
              <span>Preview updates as you change skins and colour. Save to keep it.</span>
            </div>
            <button className="btn" type="submit">
              Save chatbot
            </button>
          </div>
          <input type="hidden" name="id" value={props.bot.id} />
          <input type="hidden" name="widgetStyle" value={tokens.widgetStyle} />
          <input type="hidden" name="fontFamily" value={tokens.fontFamily} />
          {COLOR_FIELDS.map((field) => (
            <input key={field.key} type="hidden" name={tokenToField[field.key]} value={tokens[field.key]} />
          ))}

          <div className="studio-block">
            <div className="studio-block-top">
              <div>
                <p className="studio-kicker">01</p>
                <h2>Identity</h2>
              </div>
              <StatusBadge status={props.bot.active ? "active" : "inactive"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Name</label>
                <input name="name" defaultValue={props.bot.name} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 font-normal">
                  <input type="checkbox" name="active" defaultChecked={props.bot.active} className="w-auto" /> Live
                </label>
              </div>
            </div>
            <div className="mt-2">
              <label>Avatar name</label>
              <input name="avatarName" defaultValue={props.bot.avatarName || ""} placeholder="e.g. Zara" />
            </div>
            <div className="mt-2">
              <AvatarCropField chatbotId={props.bot.id} initialUrl={props.bot.avatarImageUrl || ""} />
            </div>
            <div className="mt-2">
              <label>System prompt</label>
              <textarea name="systemPrompt" rows={3} defaultValue={props.bot.systemPrompt} />
            </div>
          </div>

          <div className="studio-block">
            <p className="studio-kicker">02</p>
            <h2>Look</h2>
            <p className="studio-lead">Interchangeable skins. Same lead, book, call, and chat actions.</p>
            <div className="studio-styles">
              {WIDGET_STYLE_META.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className="studio-style"
                  data-on={tokens.widgetStyle === style.id}
                  onClick={() => pickStyle(style.id)}
                >
                  <StyleThumb
                    id={style.id}
                    accent={style.suggested.accent}
                    panel={style.suggested.panel}
                    surface={style.suggested.surface}
                    userBubble={style.suggested.userBubble}
                  />
                  <div className="studio-dots" aria-hidden>
                    {[style.suggested.accent, style.suggested.userBubble, style.suggested.panel, style.suggested.surface].map(
                      (dot, i) => (
                        <i key={i} style={{ background: dot }} />
                      ),
                    )}
                  </div>
                  <strong>{style.name}</strong>
                  <span>
                    {style.blurb} {style.options}.
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="studio-block">
            <p className="studio-kicker">03</p>
            <h2>Colour & type</h2>
            <p className="studio-lead">Applies to every skin. Fonts load in the widget iframe.</p>
            <div className="studio-colors">
              {COLOR_FIELDS.map((field) => (
                <ColorField
                  key={field.key}
                  label={field.name}
                  hint={field.hint}
                  value={tokens[field.key]}
                  onChange={(hex) => patch({ [field.key]: hex } as Partial<AppearanceTokens>)}
                />
              ))}
            </div>
            <div className="mt-2">
              <label>Font</label>
              <select
                value={tokens.fontFamily}
                onChange={(e) => patch({ fontFamily: e.target.value as WidgetFont })}
              >
                {WIDGET_FONT_META.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
              <p className="hint" style={{ fontFamily: WIDGET_FONT_META.find((f) => f.id === tokens.fontFamily)?.stack }}>
                {COLOR_FIELDS[0].hint}. Fonts load in the widget iframe so they match the embed.
              </p>
            </div>
          </div>

          <div className="studio-block">
            <p className="studio-kicker">04</p>
            <h2>Voice</h2>
            <p className="studio-lead">Each line is its own greeting bubble.</p>
            <textarea name="greetingsText" rows={4} defaultValue={props.greetingsText} />
          </div>

          <div className="studio-block">
            <p className="studio-kicker">05</p>
            <h2>Connect</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Clinic phone</label>
                <input name="phone" defaultValue={props.bot.phone || ""} placeholder={props.org.phone || "020 7946 0123"} />
              </div>
              <div>
                <label>Booking URL</label>
                <input
                  name="bookingUrl"
                  defaultValue={props.bot.bookingUrl || ""}
                  placeholder={props.org.bookingUrl || "https://practice.dently.app/book"}
                />
              </div>
            </div>
            <p className="hint">Blank uses Settings. Every skin’s Book / Call buttons use these.</p>
          </div>

          <button className="btn studio-save-inline" type="submit">
            Save chatbot
          </button>
        </form>

        <div className="studio-block">
          <p className="studio-kicker">06</p>
          <h2>Actions</h2>
          <p className="studio-lead">Lead opens the form then AI chat. Book opens the URL. Call dials the clinic.</p>
          <ul className="space-y-2">
            {props.options.map((opt) => (
              <li key={opt.id} className="studio-action">
                <form action="/api/form/updateOption" method="post" className="grid grid-cols-2 gap-1.5">
                  <input type="hidden" name="chatbotId" value={props.bot.id} />
                  <input type="hidden" name="optionId" value={opt.id} />
                  <div>
                    <label>Label</label>
                    <input name="label" defaultValue={opt.label} required />
                  </div>
                  <div>
                    <label>Type</label>
                    <select name="actionType" defaultValue={opt.actionType || "lead"}>
                      <option value="lead">{actionLabels.lead}</option>
                      <option value="book">{actionLabels.book}</option>
                      <option value="call">{actionLabels.call}</option>
                    </select>
                  </div>
                  <div>
                    <label>Enquiry text</label>
                    <input name="starterMessage" defaultValue={opt.starterMessage} />
                  </div>
                  <div>
                    <label>URL override</label>
                    <input name="url" defaultValue={opt.url || ""} />
                  </div>
                  <button className="btn tiny" type="submit">
                    Update
                  </button>
                </form>
                <form action="/api/form/deleteOption" method="post" className="mt-1">
                  <input type="hidden" name="chatbotId" value={props.bot.id} />
                  <input type="hidden" name="optionId" value={opt.id} />
                  <button className="btn secondary tiny" type="submit">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action="/api/form/addOption" method="post" className="studio-action studio-action-new">
            <input type="hidden" name="chatbotId" value={props.bot.id} />
            <div>
              <label>New label</label>
              <input name="label" placeholder="e.g. Whitening" required />
            </div>
            <div>
              <label>Type</label>
              <select name="actionType" defaultValue="lead">
                <option value="lead">{actionLabels.lead}</option>
                <option value="book">{actionLabels.book}</option>
                <option value="call">{actionLabels.call}</option>
              </select>
            </div>
            <div>
              <label>Enquiry text</label>
              <input name="starterMessage" />
            </div>
            <div>
              <label>URL override</label>
              <input name="url" />
            </div>
            <button className="btn tiny col-span-2" type="submit">
              Add treatment
            </button>
          </form>
        </div>

        <div className="studio-block" id="knowledge">
          <p className="studio-kicker">07</p>
          <h2>Knowledge</h2>
          <p className="studio-lead">Change the text, then Edit & add. Saved FAQs stay editable. Packs drop in a group you can tweak after.</p>
          <div className="studio-pack-row">
            {KNOWLEDGE_PACKS.map((pack) => (
              <form key={pack.id} action="/api/form/addKnowledgePack" method="post">
                <input type="hidden" name="chatbotId" value={props.bot.id} />
                <input type="hidden" name="packId" value={pack.id} />
                <button className="btn secondary tiny" type="submit" title={pack.blurb}>
                  Add {pack.label} pack
                </button>
              </form>
            ))}
          </div>
          {KNOWLEDGE_PACKS.map((pack) => (
            <div key={pack.id} className="mb-3">
              <div className="mb-1 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
                {pack.label} · {pack.blurb}
              </div>
              <div className="studio-examples">
                {pack.items.map((item) => {
                  const saved = props.faqs.find((faq) => knowledgeKey(faq) === knowledgeKey(item));
                  return (
                    <div key={item.question} className="studio-example">
                      <KnowledgeEditor
                        chatbotId={props.bot.id}
                        item={saved}
                        title={item.title}
                        question={item.question}
                        answer={item.answer}
                        submitLabel={saved ? "Save edits" : "Edit & add"}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mb-1 mt-3 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">Custom FAQs</div>
          {customFaqs.length === 0 ? (
            <p className="hint !mt-0">Catalog items you add are edited in the lists above. Write anything else here.</p>
          ) : null}
          <ul className="space-y-2">
            {customFaqs.map((faq) => (
              <li key={faq.id} className="studio-example">
                <KnowledgeEditor
                  chatbotId={props.bot.id}
                  item={faq}
                  title={faq.title}
                  question={faq.question}
                  answer={faq.answer}
                  submitLabel="Save edits"
                />
              </li>
            ))}
          </ul>
          <form action="/api/form/addKnowledge" method="post" className="mt-2 space-y-1.5">
            <input type="hidden" name="chatbotId" value={props.bot.id} />
            <input name="title" placeholder="Title" required />
            <input name="question" placeholder="Question" required />
            <textarea name="answer" placeholder="Answer" rows={2} required />
            <button className="btn tiny" type="submit">
              Add custom FAQ
            </button>
          </form>
        </div>

        <div className="studio-block">
          <p className="studio-kicker">08</p>
          <h2>Embed</h2>
          <p className="hint !mt-0 mb-1">Paste into WordPress (Custom HTML) or any site footer.</p>
          <textarea readOnly rows={2} value={props.snippet} />
          <p className="hint">Key: {props.bot.widgetKey}</p>
        </div>

        <div className="studio-block studio-danger">
          <p className="studio-kicker">09</p>
          <h2>Delete</h2>
          <p className="studio-lead">Removes this widget. Patient leads stay in the CRM. The embed snippet will stop working.</p>
          <DeleteChatbotButton id={props.bot.id} name={props.bot.name} className="btn danger" />
        </div>
      </div>

      <aside className="chatbot-studio-preview">
        <div className="studio-preview-card">
          <header className="studio-preview-head">
            <span className="studio-live-dot" />
            <div>
              <h2>Live preview</h2>
              <p>Style, colours, and font update here immediately.</p>
            </div>
          </header>
          {!props.bot.active ? (
            <p className="studio-preview-note">Paused. Preview still works; turn Live on to show on your site.</p>
          ) : null}
          <div className="studio-preview-stage" style={{ background: tokens.surface }}>
            <iframe key={previewSrc} src={previewSrc} title="Widget preview" className="h-full w-full border-0 bg-transparent" />
          </div>
        </div>
      </aside>
    </div>
  );
}
