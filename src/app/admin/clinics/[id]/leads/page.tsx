import { notFound } from "next/navigation";
import { BackLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await readStore();
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const leads = store.leads.filter((l) => l.organizationId === id);

  return (
    <div>
      <BackLink href={`/admin/clinics/${id}`}>{org.name}</BackLink>
      <PageHeader
        kicker="Leads"
        title={org.name}
        action={
          <form action="/api/form/impersonate" method="post">
            <input type="hidden" name="organizationId" value={id} />
            <button className="btn" type="submit">
              Edit in clinic CRM
            </button>
          </form>
        }
      />
      <div className="table-wrap page-enter">
        {leads.length === 0 ? (
          <EmptyState title="No leads" body="This clinic has not captured enquiries yet." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Inquiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="font-medium">{lead.name}</td>
                  <td>
                    {lead.email}
                    <br />
                    <span className="text-neutral-500">{lead.phone}</span>
                  </td>
                  <td className="max-w-sm truncate">{lead.inquiry}</td>
                  <td>
                    <StatusBadge status={lead.status} />
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
