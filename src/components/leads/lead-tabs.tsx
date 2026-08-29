"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type LeadTab = "enquiry" | "activity" | "chat" | "followups" | "notes" | "recalls";

function tabHref(id: string, tab: LeadTab) {
  return tab === "activity" ? `/app/leads/${id}` : `/app/leads/${id}?tab=${tab}`;
}

const TabCtx = createContext<{ tab: LeadTab }>({ tab: "activity" });

export function useLeadTab() {
  return useContext(TabCtx).tab;
}

export function LeadTabField() {
  const tab = useLeadTab();
  return <input type="hidden" name="tab" value={tab} />;
}

export function LeadTabShell(props: {
  leadId: string;
  initial: LeadTab;
  tabs: { id: LeadTab; label: string; badge?: number }[];
  children: ReactNode;
}) {
  const [tab, setTab] = useState<LeadTab>(props.initial);

  function select(next: LeadTab) {
    setTab(next);
    window.history.replaceState(window.history.state, "", tabHref(props.leadId, next));
  }

  return (
    <TabCtx.Provider value={{ tab }}>
      <nav className="lead-tabs">
        {props.tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "active" : undefined}
            onClick={() => select(item.id)}
          >
            {item.label}
            {item.badge ? <span className="lead-tab-badge">{item.badge}</span> : null}
          </button>
        ))}
      </nav>
      {props.children}
    </TabCtx.Provider>
  );
}

function matches(tab: LeadTab, value?: LeadTab | LeadTab[]) {
  if (!value) return false;
  return Array.isArray(value) ? value.includes(tab) : value === tab;
}

export function LeadTabPanel(props: {
  when?: LeadTab | LeadTab[];
  unless?: LeadTab | LeadTab[];
  children: ReactNode;
}) {
  const tab = useLeadTab();
  if (props.when && !matches(tab, props.when)) return null;
  if (props.unless && matches(tab, props.unless)) return null;
  return <>{props.children}</>;
}
