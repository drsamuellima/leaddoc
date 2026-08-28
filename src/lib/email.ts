import { allowDemoFallbacks } from "./config";
import { appUrl, hasResend } from "./integrations";

async function sendEmail(to: string, subject: string, text: string) {
  if (!to) return;
  if (!hasResend()) {
    if (allowDemoFallbacks()) {
      console.log("[email demo]", to, subject, text);
      return;
    }
    console.error("[email] RESEND_API_KEY is not set; skipped", subject);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.LEAD_FROM_EMAIL || "LeadDoc <noreply@localhost>",
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    console.error("[email] Resend failed", res.status, detail);
  }
}

export async function sendLeadEmail(to: string, lead: { name: string; email: string; phone: string; inquiry: string }) {
  const text = `New widget lead\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nInquiry: ${lead.inquiry}`;
  await sendEmail(to, `New lead: ${lead.name}`, text);
}

export async function sendInviteEmail(to: string, opts: { name: string; clinicName: string; password: string }) {
  const text = `Hi ${opts.name},\n\nYou have been added to ${opts.clinicName} on LeadDoc.\n\nSign in: ${appUrl()}/login\nEmail: ${to}\nTemporary password: ${opts.password}\n\nChange this password after you sign in.`;
  await sendEmail(to, `You're invited to ${opts.clinicName} on LeadDoc`, text);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const text = `Reset your LeadDoc password using this link (valid for 1 hour):\n\n${link}\n\nIf you did not ask for this, you can ignore the email.`;
  await sendEmail(to, "Reset your LeadDoc password", text);
}

export async function sendDunningEmail(to: string, clinicName: string) {
  const text = `The LeadDoc subscription for ${clinicName} is past due. The website chat is paused until payment succeeds.\n\nUpdate billing: ${appUrl()}/app/settings`;
  await sendEmail(to, `LeadDoc billing issue for ${clinicName}`, text);
}
