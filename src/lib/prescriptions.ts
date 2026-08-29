import type { ChatbotActionType, SetupTreatmentDraft } from "./types";

export type PrescriptionChoice = {
  id: string;
  label: string;
  blurb: string;
  actionType: ChatbotActionType;
};

export const PRESCRIPTION_CATALOG: PrescriptionChoice[] = [
  { id: "hygiene", label: "Check-up & hygiene", blurb: "Exams, scale and polish, recalls", actionType: "lead" },
  { id: "whitening", label: "Teeth whitening", blurb: "In-chair or take-home brightening", actionType: "lead" },
  { id: "aligners", label: "Invisalign / aligners", blurb: "Clear straightening consults", actionType: "lead" },
  { id: "implants", label: "Dental implants", blurb: "Replace missing teeth", actionType: "lead" },
  { id: "veneers", label: "Veneers", blurb: "Smile design and composites", actionType: "lead" },
  { id: "bonding", label: "Composite bonding", blurb: "Chips, gaps, edge repair", actionType: "lead" },
  { id: "emergency", label: "Emergency / pain", blurb: "Same-day pain and trauma", actionType: "call" },
  { id: "root", label: "Root canal", blurb: "Save an infected tooth", actionType: "lead" },
  { id: "wisdom", label: "Wisdom teeth", blurb: "Assessment and removal", actionType: "lead" },
  { id: "nhs", label: "NHS dentistry", blurb: "NHS exams and treatments", actionType: "lead" },
  { id: "kids", label: "Children's dentistry", blurb: "Gentle visits for families", actionType: "lead" },
  { id: "dentures", label: "Dentures", blurb: "Full or partial dentures", actionType: "lead" },
  { id: "book", label: "Book an appointment", blurb: "Opens your booking page", actionType: "book" },
  { id: "call", label: "Call the practice", blurb: "Dials the front desk", actionType: "call" },
];

export function prescriptionDraft(choice: PrescriptionChoice): SetupTreatmentDraft {
  return {
    label: choice.label,
    actionType: choice.actionType,
    starterMessage: `I'd like to ask about ${choice.label}.`,
    url: "",
  };
}

export function togglePrescription(selected: SetupTreatmentDraft[], choice: PrescriptionChoice): SetupTreatmentDraft[] {
  const exists = selected.some((row) => row.label.toLowerCase() === choice.label.toLowerCase());
  if (exists) return selected.filter((row) => row.label.toLowerCase() !== choice.label.toLowerCase());
  return [...selected, prescriptionDraft(choice)];
}

export function isPrescriptionSelected(selected: SetupTreatmentDraft[], choice: PrescriptionChoice) {
  return selected.some((row) => row.label.toLowerCase() === choice.label.toLowerCase());
}
