import Link from "next/link";
import { notFound } from "next/navigation";
import { impersonateAction } from "@/lib/actions";
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
    <div className="space-y-4">
      <Link href={`/admin/clinics/${id}`} className="text-sm text-teal-800 underline">
        Back to {org.name}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <form action={impersonateAction}>
          <input type="hidden" name="organizationId" value={id} />
          <button className="btn" type="submit">
            Edit in clinic CRM
          </button>
        </form>
      </div>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Inquiry</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td className="px-4 py-2">{lead.name}</td>
                <td className="px-4 py-2">
                  {lead.email}
                  <br />
                  {lead.phone}
                </td>
                <td className="px-4 py-2">{lead.inquiry}</td>
                <td className="px-4 py-2">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
