import { DashboardShell } from "@/components/dashboard-shell";
import { requireAdmin } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Clinics", icon: "clinics" as const },
  { href: "/admin/clinics/new", label: "Add clinic", icon: "plus" as const },
  { href: "/admin/plans", label: "Plans", icon: "plans" as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <DashboardShell
      home="/admin"
      brand="DentChat"
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
