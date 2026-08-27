import Link from "next/link";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function OverviewPage() {
  const { org } = await getClinicContext();
  const store = await readStore();
  const leads = store.leads.filter((l) => l.organizationId === org.id);
  const bots = store.chatbots.filter((b) => b.organizationId === org.id);
  const unread = store.notifications.filter((n) => n.organizationId === org.id && !n.readAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-sm text-slate-500">Leads</div>
          <div className="mt-1 text-3xl font-semibold">{leads.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Chatbots</div>
          <div className="mt-1 text-3xl font-semibold">{bots.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Unread alerts</div>
          <div className="mt-1 text-3xl font-semibold">{unread.length}</div>
        </div>
      </div>
      <div className="card">
        <h2 className="font-semibold">Subscription</h2>
        <p className="mt-1 text-sm text-slate-600">Status: {org.subscriptionStatus}</p>
        <Link href="/app/settings" className="mt-3 inline-block text-sm text-teal-800 underline">
          Billing settings
        </Link>
      </div>
      <div className="card">
        <h2 className="font-semibold">Latest leads</h2>
        <ul className="mt-3 divide-y">
          {leads.slice(0, 5).map((lead) => (
            <li key={lead.id} className="flex justify-between py-2 text-sm">
              <Link href={`/app/leads/${lead.id}`} className="font-medium hover:underline">
                {lead.name}
              </Link>
              <span className="text-slate-500">{lead.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
