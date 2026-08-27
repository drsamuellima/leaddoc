import {
  addKnowledgeAction,
  addOptionAction,
  deleteKnowledgeAction,
  deleteOptionAction,
  saveChatbotAction,
} from "@/lib/actions";
import { getClinicContext } from "@/lib/auth";
import { appUrl } from "@/lib/integrations";
import { readStore } from "@/lib/store";
import { notFound } from "next/navigation";

export default async function ChatbotEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await getClinicContext();
  const store = await readStore();
  const bot = store.chatbots.find((b) => b.id === id && b.organizationId === org.id);
  if (!bot) notFound();
  const options = store.chatbotOptions.filter((o) => o.chatbotId === bot.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const faqs = store.knowledgeItems.filter((k) => k.chatbotId === bot.id);
  const snippet = `<script src="${appUrl()}/widget.js" data-widget-key="${bot.widgetKey}" async></script>`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{bot.name}</h1>
      <form action={saveChatbotAction} className="card space-y-3">
        <input type="hidden" name="id" value={bot.id} />
        <div>
          <label>Name</label>
          <input name="name" defaultValue={bot.name} />
        </div>
        <div>
          <label>Greeting</label>
          <textarea name="greeting" rows={2} defaultValue={bot.greeting} />
        </div>
        <div>
          <label>System prompt</label>
          <textarea name="systemPrompt" rows={5} defaultValue={bot.systemPrompt} />
        </div>
        <label className="flex items-center gap-2 font-normal">
          <input type="checkbox" name="active" defaultChecked={bot.active} className="w-auto" /> Active
        </label>
        <button className="btn" type="submit">
          Save chatbot
        </button>
      </form>

      <div className="card space-y-3">
        <h2 className="font-semibold">Widget snippet</h2>
        <p className="text-sm text-slate-600">Paste into WordPress (Custom HTML) or any site footer.</p>
        <textarea readOnly rows={3} value={snippet} />
        <a className="text-sm text-teal-800 underline" href={`/w/${bot.widgetKey}`} target="_blank">
          Preview widget
        </a>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Initial options</h2>
        <ul className="space-y-2">
          {options.map((opt) => (
            <li key={opt.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {opt.label} — {opt.starterMessage}
              </span>
              <form action={deleteOptionAction}>
                <input type="hidden" name="chatbotId" value={bot.id} />
                <input type="hidden" name="optionId" value={opt.id} />
                <button className="btn secondary" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addOptionAction} className="grid gap-2 md:grid-cols-3">
          <input type="hidden" name="chatbotId" value={bot.id} />
          <input name="label" placeholder="Button label" required />
          <input name="starterMessage" placeholder="Message sent when clicked" />
          <button className="btn" type="submit">
            Add option
          </button>
        </form>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">FAQs / knowledge</h2>
        <ul className="space-y-3">
          {faqs.map((faq) => (
            <li key={faq.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-medium">{faq.title}</div>
              <div className="text-slate-600">{faq.question}</div>
              <div className="mt-1">{faq.answer}</div>
              <form action={deleteKnowledgeAction} className="mt-2">
                <input type="hidden" name="chatbotId" value={bot.id} />
                <input type="hidden" name="knowledgeId" value={faq.id} />
                <button className="btn secondary" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addKnowledgeAction} className="space-y-2">
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
