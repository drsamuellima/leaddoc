export type KnowledgeExample = {
  title: string;
  question: string;
  answer: string;
};

export type KnowledgePack = {
  id: string;
  label: string;
  blurb: string;
  items: KnowledgeExample[];
};

export const KNOWLEDGE_PACKS: KnowledgePack[] = [
  {
    id: "practice",
    label: "Practice",
    blurb: "Hours, parking, what to bring",
    items: [
      {
        title: "Hours",
        question: "What are your opening hours?",
        answer:
          "Monday–Friday 8:00–18:00, Saturday 9:00–13:00. Closed Sunday. For out-of-hours pain, call the practice number and follow the recorded instructions.",
      },
      {
        title: "Parking",
        question: "Is there parking at the practice?",
        answer:
          "Yes — a small patient car park is behind the building, plus pay-and-display on the street. Please allow extra time at peak hours.",
      },
      {
        title: "What to bring",
        question: "What should I bring to my appointment?",
        answer:
          "Please bring photo ID, a list of current medications, and your NHS number if you have one. Arrive 5–10 minutes early for new-patient paperwork.",
      },
      {
        title: "Cancellation",
        question: "How do I cancel or rearrange an appointment?",
        answer:
          "Please give at least 24 hours’ notice by phone or through this chat. Late cancellations may be charged according to our practice policy.",
      },
    ],
  },
  {
    id: "patients",
    label: "Patients",
    blurb: "NHS, children, emergencies",
    items: [
      {
        title: "New patients",
        question: "Do you accept new NHS or private patients?",
        answer:
          "We currently accept new private patients. NHS availability is limited — leave your details and the team will confirm what we can offer.",
      },
      {
        title: "Children",
        question: "Do you see children?",
        answer:
          "Yes. We see children for check-ups, hygiene advice, and gentle treatment. A parent or guardian should attend the first visit.",
      },
      {
        title: "Emergencies",
        question: "I have dental pain — can I be seen today?",
        answer:
          "Call the practice for same-day emergency slots. Describe swelling, bleeding, or trauma so we can prioritise. Out of hours, follow NHS 111 dental advice.",
      },
    ],
  },
  {
    id: "treatments",
    label: "Treatments",
    blurb: "Invisalign, whitening, implants",
    items: [
      {
        title: "Invisalign",
        question: "Do you offer Invisalign or teeth straightening?",
        answer:
          "Yes. We offer Invisalign and other aligner options after a consultation and scan. Leave your details and we can arrange a smile assessment.",
      },
      {
        title: "Whitening",
        question: "Do you do teeth whitening?",
        answer:
          "We offer dentist-supervised whitening. A short exam checks suitability first. Results vary; we will explain home trays versus in-chair options.",
      },
      {
        title: "Implants",
        question: "Can you replace missing teeth with implants?",
        answer:
          "Yes — dental implants are planned after assessment, X-rays, and a discussion of alternatives such as bridges. Book a consultation to see if you are a candidate.",
      },
      {
        title: "Hygiene",
        question: "Can I book a scale and polish or hygiene visit?",
        answer:
          "Yes. Hygiene appointments cover scale and polish, gum health, and home-care advice. Existing patients can often be seen sooner than new examinations.",
      },
      {
        title: "Facial aesthetics",
        question: "Do you offer Botox or facial aesthetics?",
        answer:
          "Where available, facial aesthetic treatments are provided by trained clinicians after a face-to-face consultation. Ask the team which treatments we currently offer.",
      },
      {
        title: "Aftercare",
        question: "What aftercare should I follow after treatment?",
        answer:
          "Follow the written advice we give you. Avoid hard foods if numb, keep the area clean, and contact us if pain, swelling, or bleeding gets worse rather than better.",
      },
    ],
  },
  {
    id: "money",
    label: "Fees",
    blurb: "Pricing, finance, insurance",
    items: [
      {
        title: "Fees",
        question: "How much do treatments cost?",
        answer:
          "Fees depend on the treatment. We publish a guide for exams and hygiene; larger work is quoted after assessment. Ask for a written estimate before you proceed.",
      },
      {
        title: "Finance",
        question: "Do you offer payment plans or finance?",
        answer:
          "Interest-free or staged plans may be available for larger treatment. Eligibility is subject to status. The reception team can outline current options.",
      },
      {
        title: "Insurance",
        question: "Do you work with dental insurance or Denplan?",
        answer:
          "We can provide invoices and codes for insurance claims. Cover varies by policy — we recommend checking with your provider before treatment.",
      },
    ],
  },
];

export function allKnowledgeExamples(): KnowledgeExample[] {
  return KNOWLEDGE_PACKS.flatMap((pack) => pack.items);
}

export function knowledgeKey(item: Pick<KnowledgeExample, "title" | "question">) {
  return `${item.title.trim().toLowerCase()}|${item.question.trim().toLowerCase()}`;
}
