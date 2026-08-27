"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { formatLeadDateTime } from "@/lib/leads";
import type { LeadStatus } from "@/lib/types";
import { LeadAvatar } from "./lead-avatar";
import { PipelineBar } from "./pipeline-bar";
import { StaffAvatars } from "./staff-avatars";

export type LeadListRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  inquiry: string;
  status: LeadStatus;
  followUpAt: string | null;
  source: string;
  owners: { id: string; name: string }[];
};

export function LeadListTable({ leads }: { leads: LeadListRow[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => leads.filter((lead) => selected[lead.id]).map((lead) => lead.id), [leads, selected]);
  const allChecked = leads.length > 0 && selectedIds.length === leads.length;

  function toggleAll() {
    if (allChecked) {
      setSelected({});
      return;
    }
    setSelected(Object.fromEntries(leads.map((lead) => [lead.id, true])));
  }

  return (
    <form
      action="/api/form/deleteLeads"
      method="post"
      onSubmit={(event) => {
        if (selectedIds.length === 0) {
          event.preventDefault();
          return;
        }
        const noun = selectedIds.length === 1 ? "this patient lead" : `these ${selectedIds.length} patient leads`;
        if (!window.confirm(`Delete ${noun}? Chat history and follow-ups for them will also be removed.`)) {
          event.preventDefault();
        }
      }}
    >
      <div className="lead-bulk-bar">
        <span className="text-sm text-neutral-500">
          {selectedIds.length ? `${selectedIds.length} selected` : "Select leads to delete"}
        </span>
        <button className="btn danger" type="submit" disabled={selectedIds.length === 0}>
          Delete selected
        </button>
      </div>
      <div className="table-wrap lead-table-wrap page-enter">
        <table>
          <thead>
            <tr>
              <th className="lead-check-col">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all leads on this page"
                />
              </th>
              <th>Patient</th>
              <th>Contacts</th>
              <th>Reason for visit</th>
              <th>Source</th>
              <th>Assigned</th>
              <th>Progress</th>
              <th>Stage</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="lead-check-col">
                  <input
                    type="checkbox"
                    name="ids"
                    value={lead.id}
                    checked={Boolean(selected[lead.id])}
                    onChange={(event) =>
                      setSelected((prev) => ({ ...prev, [lead.id]: event.target.checked }))
                    }
                    aria-label={`Select ${lead.name}`}
                  />
                </td>
                <td>
                  <Link href={`/app/leads/${lead.id}`} className="lead-name-cell">
                    <LeadAvatar name={lead.name} />
                    <span className="font-semibold">{lead.name}</span>
                  </Link>
                </td>
                <td className="lead-contacts">
                  <div>{lead.email}</div>
                  <div>{lead.phone}</div>
                </td>
                <td className="max-w-xs truncate text-neutral-600" title={lead.inquiry}>
                  {lead.inquiry}
                </td>
                <td className="text-neutral-600">{lead.source}</td>
                <td>
                  <StaffAvatars people={lead.owners} />
                </td>
                <td>
                  <PipelineBar status={lead.status} />
                </td>
                <td>
                  <StatusBadge status={lead.status} />
                </td>
                <td className="whitespace-nowrap text-neutral-500">{formatLeadDateTime(lead.followUpAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
