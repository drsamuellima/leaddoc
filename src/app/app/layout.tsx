import { DashboardShell } from "@/components/dashboard-shell";
import { getClinicContext } from "@/lib/auth";
import { getClinicUnreadCount } from "@/lib/store";

const nav = [
  { href: "/app", label: "Overview", icon: "home" as const },
  { href: "/app/chatbots", label: "Chatbots", icon: "bots" as const },
  { href: "/app/leads", label: "Leads", icon: "leads" as const },
  { href: "/app/pipelines", label: "Pipelines", icon: "pipeline" as const },
  { href: "/app/conversations", label: "Conversations", icon: "chat" as const },
  { href: "/app/settings", label: "Settings", icon: "settings" as const },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org, impersonating } = await getClinicContext();
  let unread = 0;
  try {
    unread = await getClinicUnreadCount(org.id);
  } catch {
    unread = 0;
  }

  return (
    <DashboardShell
      home="/app"
      subtitle={org.name}
      nav={nav}
      userName={user.name}
      searchAction="/app/leads"
      searchPlaceholder="Search patients, names, emails…"
      unread={unread}
      impersonating={impersonating ? { orgName: org.name, email: user.email } : undefined}
    >
      {children}
    </DashboardShell>
  );
}
