import Link from "next/link";
import { impersonateAction } from "@/lib/actions";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clinics</h1>
        <Link href="/admin/clinics/new" className="btn">
          Add clinic
        </Link>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search clinics" />
        <button className="btn secondary" type="submit">
          Search
        </button>
      </form>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2">Clinic</th>
              <th className="px-4 py-2">Subscription</th>
              <th className="px-4 py-2">Leads</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {clinics.map((org) => (
              <tr key={org.id} className="border-t">
                <td className="px-4 py-2 font-medium">{org.name}</td>
                <td className="px-4 py-2">{org.subscriptionStatus}</td>
                <td className="px-4 py-2">{store.leads.filter((l) => l.organizationId === org.id).length}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Link href={`/admin/clinics/${org.id}`} className="btn secondary">
                      Open
                    </Link>
                    <form action={impersonateAction}>
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
      </div>
    </div>
  );
}
