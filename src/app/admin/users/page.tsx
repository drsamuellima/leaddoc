import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminUsers } from "@/lib/store";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const users = await getAdminUsers();

  return (
    <div>
      <PageHeader kicker="Platform" title="Users" description="Every login: platform admins, clinic owners, and staff. Reset a password without impersonating." />
      {ok === "reset" ? <p className="mb-4 text-sm font-medium text-lime-800">Password reset.</p> : null}
      {error === "short" ? <p className="mb-4 text-sm font-medium text-red-700">Password must be 8+ characters.</p> : null}
      <div className="table-wrap page-enter">
        {users.length === 0 ? (
          <EmptyState title="No users" body="The first platform admin is created from ADMIN_EMAIL on boot." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Clinic</th>
                <th>New password</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="font-semibold">{user.name || "—"}</div>
                    <div className="text-xs text-neutral-500">{user.email}</div>
                  </td>
                  <td>{user.role.replace(/_/g, " ")}</td>
                  <td>{user.clinicName}</td>
                  <td>
                    <form action="/api/form/adminResetUserPassword" method="post" className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <input name="password" type="password" minLength={8} required placeholder="8+ characters" />
                      <button className="btn secondary" type="submit">
                        Reset
                      </button>
                    </form>
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
