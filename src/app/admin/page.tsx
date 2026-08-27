import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const store = await readStore();
  const query = (q || "").toLowerCase();
  const clinics = store.organizations.filter((o) => !query || o.name.toLowerCase().includes(query));

  return (
    <div>
      <PageHeader
        kicker="Platform"
        title="Clinics"
        description="Every practice on LeadDoc. Open a hub or jump in as the clinic."
        action={
          <Link href="/admin/clinics/new" className="btn">
            Add clinic
          </Link>
        }
      />
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
