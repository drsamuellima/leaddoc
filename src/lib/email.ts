import { hasResend } from "./integrations";

export async function sendLeadEmail(to: string, lead: { name: string; email: string; phone: string; inquiry: string }) {
  if (!to) return;
  const text = `New widget lead\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nInquiry: ${lead.inquiry}`;
  if (!hasResend()) {
    console.log("[lead email demo]", to, text);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.LEAD_FROM_EMAIL || "DentChat <noreply@localhost>",
      to: [to],
      subject: `New lead: ${lead.name}`,
      text,
    }),
  });
}
