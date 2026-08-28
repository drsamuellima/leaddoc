import { NextResponse } from "next/server";
import { allowDemoFallbacks, isLive } from "@/lib/config";
import { verifyStripeSignature } from "@/lib/crypto";
import { sendDunningEmail } from "@/lib/email";
import { mutateStore } from "@/lib/store";
import type { SubscriptionStatus } from "@/lib/types";

type StripeObject = {
  client_reference_id?: string;
  customer?: string;
  subscription?: string;
  id?: string;
  status?: string;
  metadata?: Record<string, string>;
};

export async function POST(request: Request) {
  const body = await request.text();
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    if (isLive()) return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  } else {
    const header = request.headers.get("stripe-signature") || "";
    if (!verifyStripeSignature(body, header, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: { type?: string; data?: { object?: StripeObject } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const obj = event.data?.object || {};
  const orgId = obj.client_reference_id || obj.metadata?.organization_id;
  const customerId = obj.customer || "";
  const subId = obj.subscription || obj.id || "";
  const rawStatus = obj.status || "active";
  const status: SubscriptionStatus =
    rawStatus === "complete" || rawStatus === "paid" ? "active" : (rawStatus as SubscriptionStatus);

  if (!orgId && !customerId) return NextResponse.json({ received: true });

  const dunning = await mutateStore((data) => {
    const org = data.organizations.find(
      (o) => o.id === orgId || (customerId && o.stripeCustomerId === customerId),
    );
    if (!org) return null;
    if (customerId) org.stripeCustomerId = customerId;
    if (subId) org.stripeSubscriptionId = subId;
    if (event.type?.includes("subscription") || event.type === "checkout.session.completed") {
      org.subscriptionStatus = status;
    }
    if (status !== "past_due") return null;
    const owner = data.profiles.find((p) => p.organizationId === org.id && p.role === "clinic_owner");
    return owner ? { to: owner.email, clinicName: org.name } : null;
  });

  if (dunning && !allowDemoFallbacks()) {
    await sendDunningEmail(dunning.to, dunning.clinicName);
  }

  return NextResponse.json({ received: true });
}
