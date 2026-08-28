import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminUsersPage() {
  await requireAdmin();
  const store = await readStore();
  const users = [...store.profiles].sort((a, b) => a.email.localeCompare(b.email));
  const orgName = (id: string | null) => (id ? store.organizations.find((o) => o.id === id)?.name || "—" : "Platform");

  return (
    <div>
      <PageHeader kicker="Platform" title="Users" description="Every login: platform admins, clinic owners, and staff. Reset a password without impersonating." />
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
                  <td>{orgName(user.organizationId)}</td>
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
