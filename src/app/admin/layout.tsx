import { DashboardShell } from "@/components/dashboard-shell";
import { requireAdmin } from "@/lib/auth";

export const maxDuration = 15;

const nav = [
  { href: "/admin", label: "Clinics", icon: "clinics" as const },
  { href: "/admin/leads", label: "All leads", icon: "leads" as const },
  { href: "/admin/users", label: "Users", icon: "users" as const },
  { href: "/admin/plans", label: "Plans", icon: "plans" as const },
  { href: "/admin/audit", label: "Activity", icon: "activity" as const },
  { href: "/admin/clinics/new", label: "Add clinic", icon: "plus" as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <DashboardShell
      home="/admin"
      subtitle="Platform admin"
      nav={nav}
      userName={user.name}
      searchAction="/admin"
      searchPlaceholder="Search clinics…"
      unread={0}
      showNotifications={false}
    >
      {children}
    </DashboardShell>
  );
}
