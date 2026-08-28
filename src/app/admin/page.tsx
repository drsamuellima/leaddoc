import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { platformStatus } from "@/lib/platform-status";
import { readStore } from "@/lib/store";

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-[#e8f6c8] text-[#365314]" : "bg-[#ffe4e0] text-[#9f1239]"}`}>
      {label}
    </span>
  );
}

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const [store, status] = await Promise.all([readStore(), platformStatus()]);
  const query = (q || "").toLowerCase();
  const clinics = store.organizations.filter((o) => !query || o.name.toLowerCase().includes(query));
  const dbOk = status.database === "ok" || status.database === "json";

  return (
    <div>
      <PageHeader
        kicker="Platform"
        title="Clinics"
        description="Every practice on LeadDoc. Open a hub, jump in as the clinic, or change billing from here."
        action={
          <Link href="/admin/clinics/new" className="btn">
            Add clinic
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Pill ok={dbOk} label={status.database === "ok" ? "Database connected" : status.database === "json" ? "Local JSON store" : "Database error"} />
        <Pill ok={status.stripe} label={status.stripe ? "Stripe" : "Stripe off"} />
        <Pill ok={status.gemini} label={status.gemini ? "Gemini" : "Gemini off"} />
        <Pill ok={status.resend} label={status.resend ? "Email" : "Email off"} />
        <span className="text-xs text-neutral-500">{store.profiles.length} users · {store.leads.length} leads</span>
      </div>
      {!dbOk ? (
        <p className="login-error mb-4 text-sm font-medium text-red-700" role="alert">
          Admin is not connected to Postgres. Set DATABASE_URL to the Supabase transaction pooler (port 6543), not SUPABASE_URL.
          {status.databaseDetail ? ` ${status.databaseDetail}` : ""}
        </p>
      ) : null}
      {query ? <p className="mb-4 text-sm text-neutral-500">Showing “{q}”</p> : null}
      <div className="table-wrap page-enter">
        {clinics.length === 0 ? (
          <EmptyState title="No clinics" body="Create one to start a practice workspace." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Subscription</th>
                <th>Leads</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((org) => (
                <tr key={org.id}>
                  <td className="font-semibold">{org.name}</td>
                  <td>
                    <StatusBadge status={org.subscriptionStatus} />
                  </td>
                  <td>{store.leads.filter((l) => l.organizationId === org.id).length}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/clinics/${org.id}`} className="btn secondary">
                        Open
                      </Link>
                      <form action="/api/form/impersonate" method="post">
                        <input type="hidden" name="organizationId" value={org.id} />
                        <button className="btn" type="submit">
                          Open as clinic
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
