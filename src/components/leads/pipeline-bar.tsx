import type { LeadStatus } from "@/lib/types";
import { LEAD_STAGE_PROGRESS } from "@/lib/leads";

export function PipelineBar({ status }: { status: LeadStatus }) {
  const pct = LEAD_STAGE_PROGRESS[status];
  return (
    <div className="lead-pipe">
      <div className="track lead-pipe-track">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span>{pct}%</span>
    </div>
  );
}
