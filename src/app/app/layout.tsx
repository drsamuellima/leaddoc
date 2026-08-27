import Link from "next/link";
import { exitImpersonateAction, logoutAction, markNotificationsReadAction } from "@/lib/actions";
import { getClinicContext } from "@/lib/auth";
import { readStore } from "@/lib/store";

const nav = [
  { href: "/app", label: "Overview" },
  { href: "/app/chatbots", label: "Chatbots" },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/conversations", label: "Conversations" },
  { href: "/app/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, org, impersonating } = await getClinicContext();
  const store = await readStore();
  const unread = store.notifications.filter((n) => n.organizationId === org.id && !n.readAt).length;

  return (
    <div className="flex min-h-full">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white px-4 py-5">
        <div className="text-lg font-semibold text-teal-800">DentChat</div>
        <div className="mt-1 text-xs text-slate-500">{org.name}</div>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-2 py-1.5 text-sm hover:bg-teal-50">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-auto">
          <button className="btn secondary w-full" type="submit">
            Log out
          </button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {impersonating ? (
          <form action={exitImpersonateAction} className="flex items-center justify-between bg-amber-100 px-4 py-2 text-sm">
            <span>
              Viewing <strong>{org.name}</strong> as admin ({user.email})
            </span>
            <button className="btn secondary" type="submit">
              Exit clinic
            </button>
          </form>
        ) : null}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">{user.name}</div>
          <form action={markNotificationsReadAction}>
            <button className="btn secondary" type="submit">
              Notifications {unread ? `(${unread})` : ""}
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
