import Link from "next/link";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function LeadsPage() {
  const { org } = await getClinicContext();
  const store = await readStore();
  const leads = store.leads
    .filter((l) => l.organizationId === org.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Inquiry</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td className="px-4 py-2">
                  <Link href={`/app/leads/${lead.id}`} className="font-medium hover:underline">
                    {lead.name}
                  </Link>
                  <div className="text-xs text-slate-500">{lead.email}</div>
                </td>
                <td className="px-4 py-2 text-slate-600">{lead.inquiry}</td>
                <td className="px-4 py-2">{lead.status}</td>
                <td className="px-4 py-2">{lead.followUpAt || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
