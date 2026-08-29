import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { readClinicStore } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/types";

function daysBack(n: number) {
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2),
      count: 0,
    });
  }
  return days;
}

function pipeline(leads: Lead[]) {
  const order: LeadStatus[] = ["new", "contacted", "booked", "closed"];
  const counts = Object.fromEntries(order.map((s) => [s, leads.filter((l) => l.status === s).length])) as Record<
    LeadStatus,
    number
  >;
  const total = Math.max(leads.length, 1);
  return { counts, total, bookedPct: Math.round((counts.booked / total) * 100) };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function OverviewPage() {
  const { org } = await getClinicContext();
  const store = await readClinicStore(org.id);
  const leads = store.leads.filter((l) => l.organizationId === org.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const bots = store.chatbots.filter((b) => b.organizationId === org.id);
  const convos = store.conversations.filter((c) => c.organizationId === org.id);
  const unread = store.notifications.filter((n) => n.organizationId === org.id && !n.readAt);
  const trend = daysBack(14);
  for (const lead of leads) {
    const key = lead.createdAt.slice(0, 10);
    const bucket = trend.find((d) => d.key === key);
    if (bucket) bucket.count += 1;
  }
  const max = Math.max(...trend.map((d) => d.count), 1);
  const pipe = pipeline(leads);
  const weekCount = trend.slice(-7).reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="page-enter">
      <PageHeader
        kicker="Clinix"
        title="Overview"
        description="Leads, chatbots and conversations at a glance."
        action={
          <Link href="/app/chatbots" className="btn">
            Open chatbots
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="metric-label">Leads captured</div>
              <div className="metric-value">{leads.length.toLocaleString()}</div>
              <p className="mt-1 text-sm text-neutral-500">{weekCount} in the last 7 days</p>
            </div>
            <StatusBadge status={org.subscriptionStatus} />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Booking pipeline</span>
              <span className="text-neutral-500">{pipe.bookedPct}% booked</span>
            </div>
            <div className="track">
              <i style={{ width: `${Math.max(pipe.bookedPct, 8)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
              <span>{pipe.counts.new} new</span>
              <span>{pipe.counts.contacted} contacted</span>
              <span>{pipe.counts.booked} booked</span>
              <span>{pipe.counts.closed} closed</span>
            </div>
          </div>
          <div className="mt-8">
            <div className="mb-3 font-medium">Trends over time</div>
            <div className="trend-bars">
              {trend.map((d, i) => (
                <div
                  key={d.key}
                  className="trend-bar"
                  title={`${d.key}: ${d.count}`}
                  style={{ height: `${Math.max(10, (d.count / max) * 100)}%`, animationDelay: `${i * 35}ms` }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Latest leads</h2>
            <Link href="/app/leads" className="text-sm font-medium text-neutral-500 hover:text-black">
              View all
            </Link>
          </div>
          <div className="mt-4">
            {leads.slice(0, 6).map((lead) => (
              <Link key={lead.id} href={`/app/leads/${lead.id}`} className="list-row">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-bold">
                  {initials(lead.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{lead.name}</div>
                  <div className="truncate text-sm text-neutral-500">{lead.inquiry}</div>
                </div>
                <StatusBadge status={lead.status} />
              </Link>
            ))}
            {leads.length === 0 ? <p className="text-sm text-neutral-500">No leads yet. Share your widget to start capturing enquiries.</p> : null}
          </div>
        </section>
      </div>

      <div className="stagger mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Chatbots", String(bots.length), `${bots.filter((b) => b.active).length} live`, "/app/chatbots"],
          ["Conversations", String(convos.length), "All visitor chats", "/app/conversations"],
          ["Unread alerts", String(unread.length), unread.length ? "Needs a look" : "You're up to date", "/app/leads"],
          ["Plan", org.subscriptionStatus, "Billing & branding", "/app/settings"],
        ].map(([label, value, hint, href]) => (
          <Link key={label} href={href} className="card metric lift relative block pb-5">
            <div className="metric-label">{label}</div>
            <div className="metric-value capitalize">{value}</div>
            <p className="mt-1 text-sm text-neutral-500">{hint}</p>
            <span className="metric-foot" />
          </Link>
        ))}
      </div>
    </div>
  );
}
