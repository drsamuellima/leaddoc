import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-full">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-slate-900 px-4 py-5 text-white">
        <div className="text-lg font-semibold">DentChat Admin</div>
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <Link href="/admin" className="rounded-md px-2 py-1.5 hover:bg-slate-800">
            Clinics
          </Link>
          <Link href="/admin/clinics/new" className="rounded-md px-2 py-1.5 hover:bg-slate-800">
            Add clinic
          </Link>
          <Link href="/admin/plans" className="rounded-md px-2 py-1.5 hover:bg-slate-800">
            Plans
          </Link>
        </nav>
        <form action={logoutAction} className="mt-auto">
          <button className="btn w-full" type="submit">
            Log out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
