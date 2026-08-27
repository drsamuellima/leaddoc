import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadAvatar } from "@/components/leads/lead-avatar";
import { StaffAvatars } from "@/components/leads/staff-avatars";
import { StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { formatLeadDate, formatLeadDateTime, LEAD_STAGE_LABELS, LEAD_STATUSES, telHref } from "@/lib/leads";
import { readStore } from "@/lib/store";
import type { LeadEvent, LeadTask, Message, Profile } from "@/lib/types";

type LeadTab = "enquiry" | "activity" | "chat" | "followups";

function parseTab(value?: string): LeadTab {
  if (value === "enquiry" || value === "chat" || value === "followups" || value === "activity") return value;
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
  const lastChat = messages[messages.length - 1];
  const profileById = new Map(store.profiles.map((p) => [p.id, p]));

  const tabs: { id: LeadTab; label: string; badge?: number }[] = [
    { id: "enquiry", label: "Enquiry" },
    { id: "activity", label: "Activity" },
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
              <StatusBadge status={lead.status} />
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
              <EnquiryCard inquiry={lead.inquiry} phone={lead.phone} source={bot?.name ?? "Widget"} status={lead.status} />
            </>
          ) : null}
          {tab === "enquiry" ? (
            <>
              <EnquiryCard inquiry={lead.inquiry} phone={lead.phone} source={bot?.name ?? "Widget"} status={lead.status} />
              <LeadSaveForm lead={lead} staff={staff} tab={tab} />
            </>
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
          {tab !== "enquiry" ? <LeadSaveForm lead={lead} staff={staff} tab={tab} /> : null}
        </div>
      </div>
    </div>
  );
}

function EnquiryCard({
  inquiry,
  phone,
  source,
  status,
}: {
  inquiry: string;
  phone: string;
  source: string;
  status: string;
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
            <StatusBadge status={status} />
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
}: {
  lead: {
    id: string;
    status: string;
    assignedTo: string | null;
    followUpAt: string | null;
    notes: string;
  };
  staff: Profile[];
  tab: LeadTab;
}) {
  return (
    <form action="/api/form/updateLead" method="post" className="card space-y-3">
      <input type="hidden" name="id" value={lead.id} />
      <input type="hidden" name="tab" value={tab} />
      <h2 className="font-semibold">Care team</h2>
      <div>
        <label>Stage</label>
        <select name="status" defaultValue={lead.status}>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
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
        <label>Clinical / reception notes</label>
        <textarea name="notes" rows={4} defaultValue={lead.notes} />
      </div>
      <button className="btn" type="submit">
        Save lead
      </button>
    </form>
  );
}
