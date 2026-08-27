import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadAvatar } from "@/components/leads/lead-avatar";
import { StaffAvatars } from "@/components/leads/staff-avatars";
import { StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { formatLeadDate, formatLeadDateTime, telHref } from "@/lib/leads";
import { findPipeline, formatGbp, formatGbpDisplay, sortedStages } from "@/lib/pipelines";
import { readStore } from "@/lib/store";
import type { LeadEvent, LeadNote, LeadRecall, LeadTask, Message, Profile, TreatmentPipeline } from "@/lib/types";

type LeadTab = "enquiry" | "activity" | "chat" | "followups" | "notes" | "recalls";

function parseTab(value?: string): LeadTab {
  if (value === "enquiry" || value === "chat" || value === "followups" || value === "activity" || value === "notes" || value === "recalls") {
    return value;
  }
  return "activity";
}

function tabHref(id: string, tab: LeadTab) {
  return tab === "activity" ? `/app/leads/${id}` : `/app/leads/${id}?tab=${tab}`;
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { tab: tabRaw, ok } = await searchParams;
  const tab = parseTab(tabRaw);
  const { org } = await getClinicContext();
  const store = await readStore();
  const lead = store.leads.find((l) => l.id === id && l.organizationId === org.id);
  if (!lead) notFound();

  const staff = store.profiles.filter((p) => p.organizationId === org.id);
  const assigned = staff.filter((p) => p.id === lead.assignedTo);
  const bot = store.chatbots.find((b) => b.id === lead.chatbotId);
  const messages = store.messages
    .filter((m) => m.conversationId === lead.conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const tasks = (store.leadTasks || [])
    .filter((t) => t.leadId === lead.id)
    .sort((a, b) => (a.dueAt || a.createdAt).localeCompare(b.dueAt || b.createdAt));
  const openTasks = tasks.filter((t) => !t.completedAt);
  const doneTasks = tasks.filter((t) => t.completedAt);
  const events = (store.leadEvents || []).filter((e) => e.leadId === lead.id);
  const notes = (store.leadNotes || [])
    .filter((n) => n.leadId === lead.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recalls = (store.leadRecalls || [])
    .filter((r) => r.leadId === lead.id)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const openRecalls = recalls.filter((r) => !r.completedAt);
  const lastChat = messages[messages.length - 1];
  const profileById = new Map(store.profiles.map((p) => [p.id, p]));
  const pipelines = store.pipelines.filter((p) => p.organizationId === org.id);
  const pipeline = findPipeline(pipelines, lead.pipelineId) || pipelines[0];
  const stageName = sortedStages(pipeline).find((s) => s.id === lead.stageId)?.name || "New enquiry";

  const tabs: { id: LeadTab; label: string; badge?: number }[] = [
    { id: "enquiry", label: "Enquiry" },
    { id: "activity", label: "Activity" },
    { id: "notes", label: "Notes", badge: notes.length || undefined },
    { id: "recalls", label: "Recalls", badge: openRecalls.length || undefined },
    { id: "chat", label: "Chat" },
    { id: "followups", label: "Follow-ups", badge: openTasks.length },
  ];

  return (
    <div className="lead-detail">
      <div className="lead-crumb">
        <Link href="/app/leads">Patient leads</Link>
        <span>/</span>
        <span>{lead.name}</span>
      </div>

      {ok === "saved" ? <p className="lead-flash">Lead updated.</p> : null}
      {ok === "task" ? <p className="lead-flash">Follow-up saved.</p> : null}

      <header className="lead-hero page-enter">
        <div className="lead-hero-main">
          <LeadAvatar name={lead.name} size="lg" />
          <div>
            <h1>{lead.name}</h1>
            <p>
              Created {formatLeadDate(lead.createdAt)}
              {lastChat ? ` · Last activity ${formatLeadDateTime(lastChat.createdAt)}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={stageName} />
              <span className="pill ink">{pipeline?.name || lead.treatment || "Treatment"}</span>
              <span className="text-sm font-medium">{formatGbpDisplay(lead.amountPence)}</span>
              <StaffAvatars people={assigned} />
            </div>
          </div>
        </div>
        <div className="lead-hero-actions">
          <a className="btn secondary" href={`mailto:${lead.email}`}>
            Mail
          </a>
          <a className="btn secondary" href={telHref(lead.phone)}>
            Call
          </a>
          <Link className="btn" href={`/app/conversations/${lead.conversationId}`}>
            Open chat
          </Link>
          <DeleteLeadButton leadId={lead.id} name={lead.name} />
        </div>
      </header>

      <nav className="lead-tabs">
        {tabs.map((item) => (
          <Link key={item.id} href={tabHref(lead.id, item.id)} className={tab === item.id ? "active" : undefined}>
            {item.label}
            {item.badge ? <span className="lead-tab-badge">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="lead-columns">
        <div className="lead-col-main">
          {tab === "activity" ? (
            <>
              <ActivityFeed events={events} messages={messages} />
              <EnquiryCard
                inquiry={lead.inquiry}
                phone={lead.phone}
                source={bot?.name ?? "Widget"}
                stage={stageName}
                treatment={pipeline?.name || lead.treatment}
                amount={formatGbpDisplay(lead.amountPence)}
              />
            </>
          ) : null}
          {tab === "enquiry" ? (
            <>
              <EnquiryCard
                inquiry={lead.inquiry}
                phone={lead.phone}
                source={bot?.name ?? "Widget"}
                stage={stageName}
                treatment={pipeline?.name || lead.treatment}
                amount={formatGbpDisplay(lead.amountPence)}
              />
              <LeadSaveForm lead={lead} staff={staff} tab={tab} pipelines={pipelines} />
            </>
          ) : null}
          {tab === "notes" ? <NotesPanel leadId={lead.id} notes={notes} profiles={profileById} summary={lead.notes} /> : null}
          {tab === "recalls" ? (
            <RecallsPanel leadId={lead.id} recalls={recalls} profiles={profileById} />
          ) : null}
          {tab === "chat" ? <ChatPanel messages={messages} /> : null}
          {tab === "followups" ? (
            <TaskPanel
              leadId={lead.id}
              tab={tab}
              openTasks={openTasks}
              doneTasks={doneTasks}
              profiles={profileById}
            />
          ) : null}
        </div>

        <div className="lead-col-side">
          {tab !== "followups" ? (
            <TaskPanel
              leadId={lead.id}
              tab={tab}
              openTasks={openTasks}
              doneTasks={doneTasks}
              profiles={profileById}
              compact
            />
          ) : null}
          {tab !== "enquiry" ? <LeadSaveForm lead={lead} staff={staff} tab={tab} pipelines={pipelines} /> : null}
        </div>
      </div>
    </div>
  );
}

function EnquiryCard({
  inquiry,
  phone,
  source,
  stage,
  treatment,
  amount,
}: {
  inquiry: string;
  phone: string;
  source: string;
  stage: string;
  treatment: string;
  amount: string;
}) {
  return (
    <section className="card lead-facts">
      <h2>Enquiry details</h2>
      <dl>
        <div>
          <dt>Reason for visit</dt>
          <dd>{inquiry}</dd>
        </div>
        <div>
          <dt>Treatment pipeline</dt>
          <dd>{treatment}</dd>
        </div>
        <div>
          <dt>Estimated value</dt>
          <dd>{amount}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{phone}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{source}</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>
            <StatusBadge status={stage} />
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ActivityFeed({
  events,
  messages,
}: {
  events: LeadEvent[];
  messages: Message[];
}) {
  const items = [
    ...events.map((e) => ({ id: e.id, at: e.createdAt, title: "Update", body: e.body })),
    ...messages.map((m) => ({
      id: m.id,
      at: m.createdAt,
      title: m.role === "user" ? "Patient message" : "Assistant reply",
      body: m.content,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="card">
      <h2 className="mb-4 font-semibold">Recent activity</h2>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No activity recorded yet.</p>
      ) : (
        <ol className="lead-timeline">
          {items.map((item) => (
            <li key={item.id}>
              <div className="lead-timeline-dot" />
              <div>
                <div className="font-medium">{item.title}</div>
                <p className="text-sm text-neutral-600">{item.body}</p>
                <time className="text-xs text-neutral-400">{formatLeadDateTime(item.at)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ChatPanel({ messages }: { messages: Message[] }) {
  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Chat transcript</h2>
      {messages.length === 0 ? (
        <p className="text-sm text-neutral-500">No messages stored for this lead yet.</p>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role === "user" ? "user" : "assistant"}`}>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-60">
              {m.role === "user" ? "Patient" : "Assistant"}
            </div>
            <p>{m.content}</p>
          </div>
        ))
      )}
    </section>
  );
}

function TaskPanel({
  leadId,
  tab,
  openTasks,
  doneTasks,
  profiles,
  compact,
}: {
  leadId: string;
  tab: LeadTab;
  openTasks: LeadTask[];
  doneTasks: LeadTask[];
  profiles: Map<string, Profile>;
  compact?: boolean;
}) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Upcoming follow-ups</h2>
      </div>
      <form action="/api/form/createLeadTask" method="post" className="lead-task-create">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="tab" value={tab} />
        <input name="title" required placeholder="Add a follow-up…" />
        <textarea name="body" rows={2} placeholder="Notes for the team (optional)" />
        <div className="lead-task-create-row">
          <input type="datetime-local" name="dueAt" />
          <label className="lead-check-label">
            <input type="checkbox" name="important" value="1" />
            Important
          </label>
          <button className="btn" type="submit">
            + Create
          </button>
        </div>
      </form>
      {openTasks.length === 0 ? <p className="text-sm text-neutral-500">No open follow-ups.</p> : null}
      {openTasks.map((task) => (
        <TaskCard key={task.id} task={task} tab={tab} creator={profiles.get(task.createdBy)} />
      ))}
      {(!compact || doneTasks.length > 0) && doneTasks.length > 0 ? (
        <div className="lead-task-history">
          <h3>Completed</h3>
          {doneTasks.map((task) => (
            <TaskCard key={task.id} task={task} tab={tab} creator={profiles.get(task.createdBy)} done />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TaskCard({
  task,
  tab,
  creator,
  done,
}: {
  task: LeadTask;
  tab: LeadTab;
  creator?: Profile;
  done?: boolean;
}) {
  return (
    <article className={`lead-task ${done ? "done" : ""}`}>
      {done ? (
        <div className="lead-task-check done" aria-hidden>
          ✓
        </div>
      ) : (
        <form action="/api/form/completeLeadTask" method="post">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="leadId" value={task.leadId} />
          <input type="hidden" name="tab" value={tab} />
          <button className="lead-task-check" type="submit" aria-label="Mark complete" />
        </form>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{task.title}</h3>
          {task.important && !done ? <span className="pill hot">Important</span> : null}
        </div>
        {task.body ? <p className="mt-1 text-sm text-neutral-600">{task.body}</p> : null}
        <div className="lead-task-meta">
          {creator ? <span>{creator.name}</span> : null}
          <span>Due {formatLeadDateTime(task.dueAt)}</span>
        </div>
      </div>
    </article>
  );
}

function LeadSaveForm({
  lead,
  staff,
  tab,
  pipelines,
}: {
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string;
    inquiry: string;
    status: string;
    assignedTo: string | null;
    followUpAt: string | null;
    notes: string;
    pipelineId: string | null;
    stageId: string | null;
    amountPence: number | null;
  };
  staff: Profile[];
  tab: LeadTab;
  pipelines: TreatmentPipeline[];
}) {
  const pipeline = findPipeline(pipelines, lead.pipelineId) || pipelines[0];
  const stages = sortedStages(pipeline);
  return (
    <form action="/api/form/updateLead" method="post" className="card space-y-3">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="tab" value={tab} />
      <h2 className="font-semibold">Patient & treatment</h2>
      <div>
        <label>Name</label>
        <input name="name" defaultValue={lead.name} />
      </div>
      <div>
        <label>Email</label>
        <input name="email" type="email" defaultValue={lead.email} />
      </div>
      <div>
        <label>Phone</label>
        <input name="phone" defaultValue={lead.phone} />
      </div>
      <div>
        <label>Reason for visit</label>
        <textarea name="inquiry" rows={2} defaultValue={lead.inquiry} />
      </div>
      <div>
        <label>Treatment pipeline</label>
        <select name="pipelineId" defaultValue={pipeline?.id || ""}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Stage</label>
        <select name="stageId" defaultValue={lead.stageId || ""}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Estimated value (£)</label>
        <input name="amount" type="number" min="0" step="0.01" defaultValue={formatGbp(lead.amountPence)} />
      </div>
      <div>
        <label>Assigned clinician</label>
        <select name="assignedTo" defaultValue={lead.assignedTo || ""}>
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Next follow-up</label>
        <input type="datetime-local" name="followUpAt" defaultValue={lead.followUpAt?.slice(0, 16) || ""} />
      </div>
      <div>
        <label>Summary notes</label>
        <textarea name="notes" rows={3} defaultValue={lead.notes} />
      </div>
      <button className="btn" type="submit">
        Save lead
      </button>
    </form>
  );
}

function NotesPanel({
  leadId,
  notes,
  profiles,
  summary,
}: {
  leadId: string;
  notes: LeadNote[];
  profiles: Map<string, Profile>;
  summary: string;
}) {
  return (
    <section className="card space-y-4">
      <h2 className="font-semibold">Notes</h2>
      {summary ? <p className="rounded-2xl bg-[#f4f4f0] p-3 text-sm">{summary}</p> : null}
      <form action="/api/form/addLeadNote" method="post" className="space-y-2">
        <input type="hidden" name="leadId" value={leadId} />
        <textarea name="body" rows={3} required placeholder="Add a clinical or reception note…" />
        <button className="btn" type="submit">
          Add note
        </button>
      </form>
      {notes.length === 0 ? <p className="text-sm text-neutral-500">No dated notes yet.</p> : null}
      <ol className="lead-timeline">
        {notes.map((note) => (
          <li key={note.id}>
            <div className="lead-timeline-dot" />
            <div>
              <div className="font-medium">{profiles.get(note.authorId)?.name || "Team"}</div>
              <p className="text-sm text-neutral-600">{note.body}</p>
              <time className="text-xs text-neutral-400">{formatLeadDateTime(note.createdAt)}</time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RecallsPanel({
  leadId,
  recalls,
  profiles,
}: {
  leadId: string;
  recalls: LeadRecall[];
  profiles: Map<string, Profile>;
}) {
  const open = recalls.filter((r) => !r.completedAt);
  const done = recalls.filter((r) => r.completedAt);
  return (
    <section className="card space-y-4">
      <h2 className="font-semibold">Recalls</h2>
      <form action="/api/form/addLeadRecall" method="post" className="lead-task-create">
        <input type="hidden" name="leadId" value={leadId} />
        <input name="reason" required placeholder="Recall reason, e.g. 6-month hygiene" />
        <div className="lead-task-create-row">
          <input type="datetime-local" name="dueAt" required />
          <button className="btn" type="submit">
            Add recall
          </button>
        </div>
      </form>
      {open.length === 0 ? <p className="text-sm text-neutral-500">No open recalls.</p> : null}
      {open.map((recall) => (
        <article key={recall.id} className="lead-task">
          <form action="/api/form/completeLeadRecall" method="post">
            <input type="hidden" name="id" value={recall.id} />
            <input type="hidden" name="leadId" value={leadId} />
            <button className="lead-task-check" type="submit" aria-label="Mark recall complete" />
          </form>
          <div>
            <h3 className="font-medium">{recall.reason}</h3>
            <div className="lead-task-meta">
              <span>Due {formatLeadDateTime(recall.dueAt)}</span>
              <span>{profiles.get(recall.createdBy)?.name}</span>
            </div>
          </div>
        </article>
      ))}
      {done.length ? (
        <div className="lead-task-history">
          <h3>Completed recalls</h3>
          {done.map((recall) => (
            <article key={recall.id} className="lead-task done">
              <div className="lead-task-check done">✓</div>
              <div>
                <h3 className="font-medium">{recall.reason}</h3>
                <div className="lead-task-meta">
                  <span>Due {formatLeadDateTime(recall.dueAt)}</span>
                  <span>Done {formatLeadDateTime(recall.completedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
