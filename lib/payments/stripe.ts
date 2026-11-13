import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { signOrderToken } from "@/lib/security/tokens";
import { siteUrl } from "@/lib/orders/queries";
import type { PaymentProvider } from "./types";

let stripe: Stripe | null = null;
export const stripeClient = () => (stripe ??= new Stripe(serverEnv().STRIPE_SECRET_KEY!));

const STRIPE_MIN_EXPIRY_MIN = 30; // hosted Checkout cannot expire sooner (holds are extended to match)

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckout(order) {
    const token = signOrderToken(order.publicToken);
    const line = (name: string, cents: number) => ({
      quantity: 1,
      price_data: { currency: "cad", unit_amount: cents, product_data: { name } },
    });
    const lines = order.items.map((i) => line(i.title, i.priceCents));
    if (order.shippingCents > 0) lines.push(line("Shipping", order.shippingCents));
    if (order.taxCents > 0) lines.push(line("HST", order.taxCents));

    const session = await stripeClient().checkout.sessions.create(
      {
        mode: "payment",
        line_items: lines,
        customer_email: order.email,
        client_reference_id: order.id,
        metadata: { order_id: order.id, order_number: order.number },
        payment_intent_data: { metadata: { order_id: order.id } },
        expires_at: Math.floor(Date.now() / 1000) + STRIPE_MIN_EXPIRY_MIN * 60 + 30,
        success_url: `${siteUrl()}/order/${token}`,
        cancel_url: `${siteUrl()}/checkout`,
      },
      { idempotencyKey: `checkout-${order.id}` },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { redirectUrl: session.url };
  },

  async refund(order) {
    const refund = await stripeClient().refunds.create(
      { payment_intent: order.paymentRef, reason: "requested_by_customer", metadata: { order_id: order.id } },
      { idempotencyKey: `refund-${order.id}` },
    );
    return { refundRef: refund.id };
  },
};
