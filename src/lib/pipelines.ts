import { randomUUID } from "crypto";
import type { Lead, LeadStatus, PipelineStage, StoreData, TreatmentPipeline } from "./types";

export function sortedStages(pipeline: TreatmentPipeline | null | undefined): PipelineStage[] {
  return [...(pipeline?.stages || [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function findPipeline(pipelines: TreatmentPipeline[], id: string | null | undefined) {
  if (!id) return undefined;
  return pipelines.find((p) => p.id === id);
}

export function findStage(pipeline: TreatmentPipeline | null | undefined, stageId: string | null | undefined) {
  if (!pipeline || !stageId) return undefined;
  return pipeline.stages.find((s) => s.id === stageId);
}

export function stageProgress(pipeline: TreatmentPipeline | null | undefined, stageId: string | null | undefined) {
  const stages = sortedStages(pipeline);
  if (!stages.length) return 0;
  const index = Math.max(0, stages.findIndex((s) => s.id === stageId));
  return Math.round(((index + 1) / stages.length) * 100);
}

export function statusFromStage(pipeline: TreatmentPipeline | null | undefined, stageId: string | null | undefined): LeadStatus {
  const stages = sortedStages(pipeline);
  if (!stages.length) return "new";
  const index = stages.findIndex((s) => s.id === stageId);
  if (index <= 0) return "new";
  if (index >= stages.length - 1) return "closed";
  if (index >= stages.length - 2) return "booked";
  return "contacted";
}

export function parseGbpToPence(value: string) {
  const trimmed = value.trim().replace(/[£,\s]/g, "");
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function formatGbp(pence: number | null | undefined) {
  if (pence == null) return "";
  return (pence / 100).toFixed(2);
}

export function formatGbpDisplay(pence: number | null | undefined) {
  if (pence == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function matchPipeline(inquiry: string, pipelines: TreatmentPipeline[]) {
  const text = inquiry.toLowerCase();
  const ranked = pipelines
    .map((pipeline) => {
      const name = pipeline.name.toLowerCase();
      const score = text.includes(name) ? 3 : name.split(/\s+/).filter((w) => w.length > 3 && text.includes(w)).length;
      return { pipeline, score };
    })
    .sort((a, b) => b.score - a.score);
  if (ranked[0]?.score) return ranked[0].pipeline;
  return pipelines[0];
}

export function applyPipelineToLead(lead: Lead, pipeline: TreatmentPipeline, stageId?: string | null) {
  const stages = sortedStages(pipeline);
  const stage = stages.find((s) => s.id === stageId) || stages[0];
  lead.pipelineId = pipeline.id;
  lead.stageId = stage?.id || null;
  lead.treatment = pipeline.name;
  lead.status = statusFromStage(pipeline, lead.stageId);
}

export function generalPipeline(orgId: string, createdAt: string): TreatmentPipeline {
  return {
    id: randomUUID(),
    organizationId: orgId,
    name: "General enquiry",
    createdAt,
    stages: [
      { id: randomUUID(), name: "New enquiry", sortOrder: 0 },
      { id: randomUUID(), name: "Contacted", sortOrder: 1 },
      { id: randomUUID(), name: "Appointment booked", sortOrder: 2 },
      { id: randomUUID(), name: "Closed", sortOrder: 3 },
    ],
  };
}

export function ensureOrgPipelines(data: StoreData) {
  let changed = false;
  if (!Array.isArray(data.pipelines)) {
    data.pipelines = [];
    changed = true;
  }
  for (const org of data.organizations) {
    if (data.pipelines.some((p) => p.organizationId === org.id)) continue;
    data.pipelines.push(generalPipeline(org.id, createdAtNow()));
    changed = true;
  }
  return changed;
}

function createdAtNow() {
  return new Date().toISOString();
}

export function demoPipelines(orgId: string, createdAt: string): TreatmentPipeline[] {
  return [
    {
      id: "pipe_hygiene",
      organizationId: orgId,
      name: "Check-up & hygiene",
      createdAt,
      stages: [
        { id: "st_hyg_new", name: "New enquiry", sortOrder: 0 },
        { id: "st_hyg_booked", name: "Exam booked", sortOrder: 1 },
        { id: "st_hyg_seen", name: "Seen", sortOrder: 2 },
        { id: "st_hyg_recall", name: "On recall", sortOrder: 3 },
      ],
    },
    {
      id: "pipe_invisalign",
      organizationId: orgId,
      name: "Invisalign",
      createdAt,
      stages: [
        { id: "st_inv_new", name: "Enquiry", sortOrder: 0 },
        { id: "st_inv_scan", name: "Scan booked", sortOrder: 1 },
        { id: "st_inv_plan", name: "Plan presented", sortOrder: 2 },
        { id: "st_inv_start", name: "Treatment started", sortOrder: 3 },
        { id: "st_inv_done", name: "Complete", sortOrder: 4 },
      ],
    },
    {
      id: "pipe_whitening",
      organizationId: orgId,
      name: "Whitening",
      createdAt,
      stages: [
        { id: "st_wht_new", name: "Enquiry", sortOrder: 0 },
        { id: "st_wht_consult", name: "Consult booked", sortOrder: 1 },
        { id: "st_wht_treat", name: "Treatment booked", sortOrder: 2 },
        { id: "st_wht_done", name: "Complete", sortOrder: 3 },
      ],
    },
    {
      id: "pipe_emergency",
      organizationId: orgId,
      name: "Emergency",
      createdAt,
      stages: [
        { id: "st_em_new", name: "New", sortOrder: 0 },
        { id: "st_em_triage", name: "Triaged", sortOrder: 1 },
        { id: "st_em_seen", name: "Seen", sortOrder: 2 },
        { id: "st_em_closed", name: "Closed", sortOrder: 3 },
      ],
    },
    {
      id: "pipe_implants",
      organizationId: orgId,
      name: "Implants",
      createdAt,
      stages: [
        { id: "st_imp_new", name: "Enquiry", sortOrder: 0 },
        { id: "st_imp_assess", name: "Assessment booked", sortOrder: 1 },
        { id: "st_imp_plan", name: "Plan agreed", sortOrder: 2 },
        { id: "st_imp_surgery", name: "Surgery booked", sortOrder: 3 },
        { id: "st_imp_done", name: "Restored", sortOrder: 4 },
      ],
    },
    {
      id: "pipe_general",
      organizationId: orgId,
      name: "General enquiry",
      createdAt,
      stages: [
        { id: "st_gen_new", name: "New enquiry", sortOrder: 0 },
        { id: "st_gen_contacted", name: "Contacted", sortOrder: 1 },
        { id: "st_gen_booked", name: "Appointment booked", sortOrder: 2 },
        { id: "st_gen_closed", name: "Closed", sortOrder: 3 },
      ],
    },
  ];
}

const STATUS_STAGE_HINT: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  booked: 2,
  closed: 99,
};

export function stageIdForStatus(pipeline: TreatmentPipeline, status: LeadStatus) {
  const stages = sortedStages(pipeline);
  if (!stages.length) return null;
  if (status === "closed") return stages[stages.length - 1].id;
  const hint = STATUS_STAGE_HINT[status];
  return stages[Math.min(hint, stages.length - 1)].id;
}
