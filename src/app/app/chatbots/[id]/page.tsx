import { AvatarCropField } from "@/components/avatar-crop-field";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { publicOrigin } from "@/lib/integrations";
import { readStore } from "@/lib/store";
import { notFound } from "next/navigation";

const actionLabels = {
  lead: "Lead form + AI chat",
  book: "Book (Dentally URL)",
  call: "Call practice",
} as const;

export default async function ChatbotEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const { org } = await getClinicContext();
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.id === id && b.organizationId === org.id);
  if (!bot) notFound();
  const options = store.chatbotOptions.filter((o) => o.chatbotId === bot.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const faqs = store.knowledgeItems.filter((k) => k.chatbotId === bot.id);
  const origin = await publicOrigin();
  const snippet = `<script src="${origin}/widget.js" data-widget-key="${bot.widgetKey}" async></script>`;
  const previewSrc = `/w/${encodeURIComponent(bot.widgetKey)}?preview=1`;
  const greetingsText = (bot.greetings?.length ? bot.greetings : [bot.greeting]).join("\n");
  const accent = bot.accentColor || org.primaryColor || "#0f766e";
  const panel = bot.panelColor || "#ffffff";
  const buttonText = bot.buttonTextColor || "#1a1a1a";

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="Chatbot"
        title={bot.name}
        description="Greetings, treatments, colours, and booking or call actions."
        action={<StatusBadge status={bot.active ? "active" : "inactive"} />}
      />
      {ok ? <p className="text-sm font-medium text-lime-800">Saved.</p> : null}

      <form action="/api/form/saveChatbot" method="post" className="card space-y-4 page-enter">
        <input type="hidden" name="id" value={bot.id} />
        <h2 className="font-semibold">Chatbot</h2>
        <div>
          <label>Name</label>
          <input name="name" defaultValue={bot.name} />
        </div>
        <div>
          <label>System prompt</label>
          <textarea name="systemPrompt" rows={5} defaultValue={bot.systemPrompt} />
        </div>
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name="active" defaultChecked={bot.active} className="w-auto" /> Active
        </label>

        <h2 className="font-semibold">Colours</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label>Accent</label>
            <input name="accentColor" type="color" defaultValue={accent} className="h-11 w-full p-1" />
            <p className="hint">Close button ring, reset icon, branding, avatar ring.</p>
          </div>
          <div>
            <label>Panel</label>
            <input name="panelColor" type="color" defaultValue={panel} className="h-11 w-full p-1" />
            <p className="hint">Greeting bubbles and treatment card.</p>
          </div>
          <div>
            <label>Button text</label>
            <input name="buttonTextColor" type="color" defaultValue={buttonText} className="h-11 w-full p-1" />
            <p className="hint">Labels on the treatment grid.</p>
          </div>
        </div>

        <h2 className="font-semibold">Avatar</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label>Avatar name</label>
            <input name="avatarName" defaultValue={bot.avatarName || ""} placeholder="e.g. Zara" />
          </div>
        </div>
        <AvatarCropField chatbotId={bot.id} initialUrl={bot.avatarImageUrl || ""} />

        <h2 className="font-semibold">Call &amp; Dentally booking</h2>
        <p className="text-sm text-neutral-500">
          Call buttons dial this number. Book buttons open the Dentally (or other booking) URL in a new tab. Leave blank to
          use the practice defaults in Settings.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label>Clinic phone</label>
            <input name="phone" defaultValue={bot.phone || ""} placeholder={org.phone || "020 7946 0123"} />
            <p className="hint">Blank uses Settings ({org.phone || "not set"}). Call buttons dial this number.</p>
          </div>
          <div>
            <label>Dentally / booking URL</label>
            <input
              name="bookingUrl"
              defaultValue={bot.bookingUrl || ""}
              placeholder={org.bookingUrl || "https://your-practice.dently.app/book"}
            />
            <p className="hint">Blank uses Settings. Book buttons open this in a new tab.</p>
          </div>
        </div>

        <h2 className="font-semibold">What to say</h2>
        <p className="text-sm text-neutral-500">Each line becomes its own greeting bubble. Add as many as you like.</p>
        <textarea name="greetingsText" rows={5} defaultValue={greetingsText} />

        <button className="btn" type="submit">
          Save chatbot
        </button>
      </form>

      <div className="card space-y-3 page-enter">
        <h2 className="font-semibold">Widget snippet</h2>
        <p className="text-sm text-neutral-500">Paste into WordPress (Custom HTML) or any site footer.</p>
        <textarea readOnly rows={3} value={snippet} />
        <p className="hint">Key: {bot.widgetKey}</p>
        <h3 className="font-semibold">Preview</h3>
        {!bot.active ? (
          <p className="text-sm text-amber-800">This chatbot is paused. Preview still works; activate it to show on your site.</p>
        ) : null}
        <div className="overflow-hidden rounded-[24px] bg-[#f4f4f0]" style={{ height: 560 }}>
          <iframe src={previewSrc} title="Widget preview" className="h-full w-full border-0 bg-transparent" />
        </div>
      </div>

      <div className="card space-y-4 page-enter">
        <div>
          <h2 className="font-semibold">Treatments / actions</h2>
          <p className="text-sm text-neutral-500">
            Shown as a two-column grid. <strong>Lead</strong> opens the enquiry form then AI chat. <strong>Book</strong>{" "}
            opens Dentally in a new tab. <strong>Call</strong> dials the clinic phone.
          </p>
        </div>
        <ul className="space-y-3">
          {options.map((opt) => (
            <li key={opt.id} className="rounded-2xl bg-[#fafaf7] p-4">
              <form action="/api/form/updateOption" method="post" className="grid gap-2 md:grid-cols-2">
                <input type="hidden" name="chatbotId" value={bot.id} />
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
                  <label>Enquiry text (lead)</label>
                  <input name="starterMessage" defaultValue={opt.starterMessage} placeholder="Prefills the lead form" />
                </div>
                <div>
                  <label>Booking URL override</label>
                  <input name="url" defaultValue={opt.url || ""} placeholder="Optional; otherwise uses Dentally URL" />
                </div>
                <button className="btn" type="submit">
                  Update
                </button>
              </form>
              <form action="/api/form/deleteOption" method="post" className="mt-2">
                <input type="hidden" name="chatbotId" value={bot.id} />
                <input type="hidden" name="optionId" value={opt.id} />
                <button className="btn secondary" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form
          action="/api/form/addOption"
          method="post"
          className="grid gap-2 rounded-2xl border border-dashed border-neutral-200 p-4 md:grid-cols-2"
        >
          <input type="hidden" name="chatbotId" value={bot.id} />
          <div>
            <label>New button label</label>
            <input name="label" placeholder="e.g. Teeth whitening" required />
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
            <label>Enquiry text (lead)</label>
            <input name="starterMessage" placeholder="Message sent when they enquire" />
          </div>
          <div>
            <label>Booking URL override</label>
            <input name="url" placeholder="Optional for Book buttons" />
          </div>
          <button className="btn md:col-span-2" type="submit">
            Add treatment
          </button>
        </form>
      </div>

      <div className="card space-y-3 page-enter">
        <h2 className="font-semibold">FAQs / knowledge</h2>
        <ul className="space-y-3">
          {faqs.map((faq) => (
            <li key={faq.id} className="rounded-2xl bg-[#fafaf7] p-4 text-sm">
              <div className="font-medium">{faq.title}</div>
              <div className="text-neutral-500">{faq.question}</div>
              <div className="mt-1">{faq.answer}</div>
              <form action="/api/form/deleteKnowledge" method="post" className="mt-2">
                <input type="hidden" name="chatbotId" value={bot.id} />
                <input type="hidden" name="knowledgeId" value={faq.id} />
                <button className="btn secondary" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action="/api/form/addKnowledge" method="post" className="space-y-2">
          <input type="hidden" name="chatbotId" value={bot.id} />
          <input name="title" placeholder="Title" required />
          <input name="question" placeholder="Question" required />
          <textarea name="answer" placeholder="Answer" rows={3} required />
          <button className="btn" type="submit">
            Add FAQ
          </button>
        </form>
      </div>
    </div>
  );
}
