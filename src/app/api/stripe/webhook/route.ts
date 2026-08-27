import { NextResponse } from "next/server";
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

  await mutateStore((data) => {
    const org = data.organizations.find(
      (o) => o.id === orgId || (customerId && o.stripeCustomerId === customerId),
    );
    if (!org) return;
    if (customerId) org.stripeCustomerId = customerId;
    if (subId) org.stripeSubscriptionId = subId;
    if (event.type?.includes("subscription") || event.type === "checkout.session.completed") {
      org.subscriptionStatus = status;
    }
  });

  return NextResponse.json({ received: true });
}
