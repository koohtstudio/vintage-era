import "server-only";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { serviceClient } from "@/lib/supabase/admin";
import { handlePaymentSucceeded } from "./finalize";
import { stripeClient } from "./stripe";

/**
 * Webhook entry point. Order of operations matters:
 *  1. verify the signature against the RAW body (rejects forged calls)
 *  2. record event_id (UNIQUE) so retries are recognised
 *  3. only then touch the order, and ONLY here is an order ever marked paid in live mode.
 */
export async function handleStripeWebhook(rawBody: string, signature: string | null): Promise<{ status: number; body: string }> {
  if (!signature) return { status: 400, body: "missing signature" };
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, serverEnv().STRIPE_WEBHOOK_SECRET!);
  } catch {
    return { status: 400, body: "invalid signature" };
  }

  const db = serviceClient();
  const { data: existing } = await db.from("payment_events").select("id, processed_at").eq("provider", "stripe").eq("event_id", event.id).maybeSingle();
  if (existing?.processed_at) return { status: 200, body: "already processed" };
  if (!existing) {
    await db.from("payment_events").insert({ provider: "stripe", event_id: event.id, type: event.type, payload: { id: event.id, type: event.type } });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      const ref = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      if (orderId && ref && s.payment_status === "paid") {
        await handlePaymentSucceeded({ orderId, paymentRef: ref });
      }
      break;
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orderId = s.client_reference_id ?? s.metadata?.order_id;
      if (orderId) await db.from("orders").update({ status: "cancelled", failure_reason: "checkout expired" }).eq("id", orderId).eq("status", "pending");
      break;
    }
    default:
      break;
  }
  await db.from("payment_events").update({ processed_at: new Date().toISOString() }).eq("provider", "stripe").eq("event_id", event.id);
  return { status: 200, body: "ok" };
}
