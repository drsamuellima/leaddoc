import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminAudit } from "@/lib/store";

export default async function AdminAuditPage() {
  await requireAdmin();
  const logs = await getAdminAudit();

  return (
    <div>
      <PageHeader kicker="Platform" title="Activity" description="Audit log of impersonation, billing, and other admin actions." />
      <div className="table-wrap page-enter">
        {logs.length === 0 ? (
          <EmptyState title="No activity yet" body="Admin actions such as opening a clinic or changing billing are listed here." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Clinic</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs text-neutral-500">{log.createdAt.replace("T", " ").slice(0, 16)}</td>
                  <td>{log.actorEmail}</td>
                  <td className="font-medium">{log.action.replace(/_/g, " ")}</td>
                  <td>{log.clinicName}</td>
                  <td className="max-w-sm truncate">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
