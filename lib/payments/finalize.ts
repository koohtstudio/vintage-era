import "server-only";
import { revalidateTag } from "next/cache";
import { createElement } from "react";
import OrderConfirmed from "@/emails/OrderConfirmed";
import DoublePayApology from "@/emails/DoublePayApology";
import { notify } from "@/lib/notify";
import { loadOrderForEmail } from "@/lib/orders/queries";
import { serviceClient } from "@/lib/supabase/admin";
import { payments } from "./index";

import { PIECES_TAG } from "@/lib/pieces/queries";

interface Finalize {
  ok: boolean;
  code: "paid" | "already" | "lost" | "not_found";
  status?: string;
}

/**
 * Called by the Stripe webhook (live) or the mock pay action (mock) with the SAME logic:
 *   finalize_order() in the database decides who wins. A winner gets a confirmation email.
 *   A loser (someone else paid for the piece first) is refunded in full and gets an apology.
 */
export async function handlePaymentSucceeded(input: { orderId: string; paymentRef: string }): Promise<Finalize> {
  const db = serviceClient();
  const { data, error } = await db.rpc("finalize_order", { p_order: input.orderId, p_payment_ref: input.paymentRef });
  if (error) throw new Error(`finalize_order failed: ${error.message}`);
  const res = data as unknown as Finalize;
  revalidateTag(PIECES_TAG);

  const order = await loadOrderForEmail(input.orderId);
  if (!order) return res;

  if (res.ok && res.code === "paid") {
    await notify({
      channel: "email",
      to: order.email,
      template: "order_confirmed",
      subject: `Order ${order.number} confirmed`,
      orderId: order.id,
      element: createElement(OrderConfirmed, {
        firstName: order.firstName,
        number: order.number,
        items: order.items.map((i) => ({ title: i.title, price: i.price })),
        total: order.total,
        fulfillment: order.fulfillment,
        storeName: order.storeName,
        statusUrl: order.statusUrl,
      }),
    });
    return res;
  }

  if (!res.ok && res.code === "lost" && res.status === "refund_pending") {
    const provider = payments();
    const { refundRef } = await provider.refund({ id: order.id, paymentRef: input.paymentRef });
    await db.rpc("mark_order_refunded", { p_order: order.id, p_refund_ref: refundRef });
    await notify({
      channel: "email",
      to: order.email,
      template: "double_pay_apology",
      subject: "We're sorry, that piece just sold",
      orderId: order.id,
      element: createElement(DoublePayApology, {
        firstName: order.firstName,
        number: order.number,
        pieceTitles: order.items.map((i) => i.title),
      }),
    });
  }
  return res;
}
