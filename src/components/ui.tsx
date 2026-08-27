import Link from "next/link";
import type { ReactNode } from "react";
import type { LeadStatus } from "@/lib/types";

export function PageHeader(props: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-head page-enter">
      <div>
        {props.kicker ? <div className="page-kicker">{props.kicker}</div> : null}
        <h1>{props.title}</h1>
        {props.description ? <p>{props.description}</p> : null}
      </div>
      {props.action ? <div className="flex flex-wrap items-center gap-2">{props.action}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: LeadStatus | string }) {
  const map: Record<string, string> = {
    new: "pill hot",
    contacted: "pill warn",
    booked: "pill good",
    closed: "pill muted",
    active: "pill good",
    trialing: "pill warn",
    inactive: "pill muted",
    past_due: "pill hot",
    canceled: "pill muted",
  };
  return <span className={map[status] || "pill muted"}>{status.replace("_", " ")}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <div className="text-lg font-semibold text-black">{title}</div>
      <p className="mt-1 text-sm">{body}</p>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex text-sm font-medium text-neutral-500 hover:text-black">
      ← {children}
    </Link>
  );
}
