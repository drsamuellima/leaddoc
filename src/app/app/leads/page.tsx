import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { org } = await getClinicContext();
  const store = await readStore();
  const query = (q || "").trim().toLowerCase();
  const leads = store.leads
    .filter((l) => l.organizationId === org.id)
    .filter((l) => {
      if (!query) return true;
      return `${l.name} ${l.email} ${l.phone} ${l.inquiry} ${l.status}`.toLowerCase().includes(query);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        kicker="CRM"
        title="Leads"
        description="Every enquiry from your widget, ready to follow up."
      />
      {query ? <p className="mb-4 text-sm text-neutral-500">Showing results for “{q}”</p> : null}
      <div className="table-wrap page-enter">
        {leads.length === 0 ? (
          <EmptyState title="No leads yet" body="When a visitor submits the chat form, they appear here." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Inquiry</th>
                <th>Status</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/app/leads/${lead.id}`} className="font-semibold hover:underline">
                      {lead.name}
                    </Link>
                    <div className="text-xs text-neutral-500">{lead.email}</div>
                  </td>
                  <td className="max-w-sm truncate text-neutral-600">{lead.inquiry}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="text-neutral-500">{lead.followUpAt ? lead.followUpAt.slice(0, 16).replace("T", " ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
