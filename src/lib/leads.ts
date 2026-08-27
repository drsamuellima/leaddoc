import type { LeadStatus } from "./types";

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "booked", "closed"];

export const LEAD_STAGE_LABELS: Record<LeadStatus, string> = {
  new: "New enquiry",
  contacted: "Contacted",
  booked: "Appointment booked",
  closed: "Closed",
};

export const LEAD_STAGE_PROGRESS: Record<LeadStatus, number> = {
  new: 25,
  contacted: 50,
  booked: 80,
  closed: 100,
};

export function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function formatLeadDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatLeadDateTime(iso: string | null | undefined) {
  return formatLeadDate(iso, true);
}
