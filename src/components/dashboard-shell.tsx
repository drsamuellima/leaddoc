"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export type DashNavItem = {
  href: string;
  label: string;
  icon: "home" | "bots" | "leads" | "chat" | "settings" | "clinics" | "plus" | "plans" | "pipeline" | "users" | "activity";
};

function Icon({ name }: { name: DashNavItem["icon"] }) {
  const common = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (name === "home") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "bots") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <rect x="5" y="8" width="14" height="11" rx="3" />
        <path d="M12 8V5M9 13h.01M15 13h.01M9 17h6" />
      </svg>
    );
  }
  if (name === "leads") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.2" />
        <path d="M20 8v6M17 11h6" />
      </svg>
    );
  }
  if (name === "pipeline") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h10M4 18h7" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="15" cy="18" r="2" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M5 18.5 4 22l3.8-1.4A9 9 0 1 0 5 18.5z" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.7.9 1.2 1.6 1.4H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    );
  }
  if (name === "clinics") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 20V8l8-5 8 5v12" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.2" />
        <path d="M20 8v6M17 11h6" />
      </svg>
    );
  }
  if (name === "activity") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M4 19V5h16v14z" />
        <path d="M8 9h8M8 13h5M8 17h3" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24">
      <path d="M4 19V5h16v14z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function isActive(pathname: string, href: string, home: string) {
  if (href === home) {
    if (pathname === href) return true;
    if (home === "/admin" && pathname.startsWith("/admin/clinics/") && !pathname.startsWith("/admin/clinics/new")) {
      return true;
    }
    return false;
  }
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function DashboardShell(props: {
  home: string;
  subtitle: string;
  nav: DashNavItem[];
  userName: string;
  searchAction: string;
  searchPlaceholder: string;
  unread: number;
  showNotifications?: boolean;
  impersonating?: { orgName: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="dash">
      <aside className="dash-sidebar" style={{ background: "var(--sidebar)" }}>
        <div className="dash-brand">
          <Link href={props.home} className="no-underline" aria-label="LeadDr. home">
            <BrandLogo on="dark" size="sidebar" />
          </Link>
          <div className="dash-brand-sub">{props.subtitle}</div>
        </div>
        <nav className="dash-nav">
          {props.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href, props.home) ? "active" : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="dash-side-foot">
          <form action="/api/form/logout" method="post">
            <button className="btn secondary w-full" type="submit">
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="dash-stage">
        {props.impersonating ? (
          <form action="/api/form/exitImpersonate" method="post" className="dash-banner">
            <span>
              Viewing <strong>{props.impersonating.orgName}</strong> as admin ({props.impersonating.email})
            </span>
            <button className="btn secondary" type="submit">
              Exit clinic
            </button>
          </form>
        ) : null}

        <div className="dash-canvas">
          <header className="dash-top">
            <form action={props.searchAction} className="dash-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
              <input name="q" placeholder={props.searchPlaceholder} />
            </form>
            <div className="dash-top-actions">
              {props.showNotifications === false ? null : (
                <form action="/api/form/markNotificationsRead" method="post">
                  <button className={`icon-btn ${props.unread ? "alert" : ""}`} type="submit" title="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
                      <path d="M10 20a2 2 0 0 0 4 0" />
                    </svg>
                  </button>
                </form>
              )}
              <div className="avatar-dot" title={props.userName}>
                {initials(props.userName) || "U"}
              </div>
            </div>
          </header>
          <main className="dash-main">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
