import { notFound } from "next/navigation";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { BackLink, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readClinicStore } from "@/lib/store";

export default async function AdminClinicLeadsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await readClinicStore(id);
  const org = store.organizations.find((o) => o.id === id);
  if (!org) notFound();
  const leads = [...store.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <BackLink href={`/admin/clinics/${id}`}>{org.name}</BackLink>
      <PageHeader
        kicker="Leads"
        title={org.name}
        description="Every enquiry this clinic has captured. Open a record in the clinic CRM to edit status, notes, and follow-ups."
        action={<ImpersonateForm organizationId={id} next="/app/leads" label="Open clinic CRM" />}
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
                <th></th>
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
                  <td>
                    <ImpersonateForm
                      organizationId={id}
                      next={`/app/leads/${lead.id}`}
                      label="Open"
                      className="btn secondary"
                    />
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
