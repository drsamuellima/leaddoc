import Link from "next/link";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminLeads } from "@/lib/store";

export default async function AdminLeadsPage() {
  await requireAdmin();
  const leads = await getAdminLeads();

  return (
    <div>
      <PageHeader
        kicker="Platform"
        title="All leads"
        description="Every enquiry across every clinic. Open the clinic hub or jump straight into that lead in the clinic CRM."
      />
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
                  <td>{lead.clinicName}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="max-w-xs truncate">{lead.inquiry}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/clinics/${lead.organizationId}`} className="btn secondary">
                        Clinic
                      </Link>
                      <ImpersonateForm
                        organizationId={lead.organizationId}
                        next={`/app/leads/${lead.id}`}
                        label="Open record"
                      />
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
