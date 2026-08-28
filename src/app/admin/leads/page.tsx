import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminLeadsPage() {
  await requireAdmin();
  const store = await readStore();
  const leads = [...store.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orgName = (id: string) => store.organizations.find((o) => o.id === id)?.name || "Unknown clinic";

  return (
    <div>
      <PageHeader kicker="Platform" title="All leads" description="Every enquiry across every clinic. Open the clinic hub or jump in as that practice." />
      <div className="table-wrap page-enter">
        {leads.length === 0 ? (
          <EmptyState title="No leads yet" body="Leads appear here when a widget captures an enquiry." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Clinic</th>
                <th>Status</th>
                <th>Enquiry</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="font-semibold">{lead.name}</div>
                    <div className="text-xs text-neutral-500">{lead.email}</div>
                  </td>
                  <td>{orgName(lead.organizationId)}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="max-w-xs truncate">{lead.inquiry}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/clinics/${lead.organizationId}`} className="btn secondary">
                        Clinic
                      </Link>
                      <form action="/api/form/impersonate" method="post">
                        <input type="hidden" name="organizationId" value={lead.organizationId} />
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
