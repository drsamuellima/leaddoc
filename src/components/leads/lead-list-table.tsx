"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteLeadsAction, patchLeadInlineAction } from "@/lib/actions";
import { formatLeadDateTime } from "@/lib/leads";
import { formatGbp, sortedStages, stageProgress } from "@/lib/pipelines";
import type { TreatmentPipeline } from "@/lib/types";
import { LeadAvatar } from "./lead-avatar";
import { PipelineBar } from "./pipeline-bar";
import { StaffAvatars } from "./staff-avatars";

export type LeadListRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  inquiry: string;
  pipelineId: string | null;
  stageId: string | null;
  amountPence: number | null;
  followUpAt: string | null;
  source: string;
  owners: { id: string; name: string }[];
};

export function LeadListTable({
  leads,
  pipelines,
  returnTo,
}: {
  leads: LeadListRow[];
  pipelines: TreatmentPipeline[];
  returnTo: string;
}) {
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
    <div>
      <form
        action={deleteLeadsAction}
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
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <div className="lead-bulk-bar">
          <span className="text-sm text-neutral-500">
            {selectedIds.length ? `${selectedIds.length} selected` : "Select leads to delete"}
          </span>
          <button className="btn danger" type="submit" disabled={selectedIds.length === 0}>
            Delete selected
          </button>
        </div>
      </form>
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
              <th>Treatment</th>
              <th>Value</th>
              <th>Pipeline stage</th>
              <th>Progress</th>
              <th>Assigned</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const pipeline = pipelines.find((p) => p.id === lead.pipelineId) || pipelines[0];
              const stages = sortedStages(pipeline);
              const stage = stages.find((s) => s.id === lead.stageId);
              return (
                <tr key={lead.id}>
                  <td className="lead-check-col">
                    <input
                      type="checkbox"
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
                      <span>
                        <span className="font-semibold">{lead.name}</span>
                        <span className="lead-inquiry-sub">{lead.inquiry}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="lead-contacts">
                    <div>{lead.email}</div>
                    <div>{lead.phone}</div>
                  </td>
                  <td>
                    <form action={patchLeadInlineAction} className="lead-inline-form">
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <select
                        name="pipelineId"
                        defaultValue={pipeline?.id || ""}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        aria-label={`Treatment for ${lead.name}`}
                      >
                        {pipelines.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </form>
                  </td>
                  <td>
                    <form action={patchLeadInlineAction} className="lead-inline-form">
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <label className="lead-amount">
                        <span>£</span>
                        <input
                          name="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={formatGbp(lead.amountPence)}
                          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
                          aria-label={`Value for ${lead.name}`}
                        />
                      </label>
                    </form>
                  </td>
                  <td>
                    <form action={patchLeadInlineAction} className="lead-inline-form">
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <select
                        name="stageId"
                        defaultValue={lead.stageId || ""}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        aria-label={`Stage for ${lead.name}`}
                      >
                        {stages.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </form>
                  </td>
                  <td>
                    <PipelineBar percent={stageProgress(pipeline, lead.stageId)} />
                    <div className="lead-stage-name">{stage?.name}</div>
                  </td>
                  <td>
                    <StaffAvatars people={lead.owners} />
                  </td>
                  <td className="whitespace-nowrap text-neutral-500">{formatLeadDateTime(lead.followUpAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
