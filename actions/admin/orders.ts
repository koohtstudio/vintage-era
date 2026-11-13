"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import ReadyForPickup from "@/emails/ReadyForPickup";
import Shipped from "@/emails/Shipped";
import { assertStaff } from "@/lib/auth/staff";
import { notify } from "@/lib/notify";
import { loadOrderForEmail } from "@/lib/orders/queries";
import { serverClient } from "@/lib/supabase/server";

const schema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["bag", "ready", "pickup", "pack", "ship"]),
  carrier: z.string().trim().max(40).optional(),
  tracking: z.string().trim().max(60).optional(),
});

/**
 * Moves an order one step. The database function checks the staff member may touch this order
 * and that the step is legal; only after it succeeds do we email the customer.
 */
export async function advanceOrder(input: z.infer<typeof schema>): Promise<{ ok: boolean; message: string }> {
  await assertStaff();
  const v = schema.parse(input);
  const sb = await serverClient();
  const { data, error } = await sb.rpc("advance_order", { p_order: v.orderId, p_action: v.action, p_carrier: v.carrier as string, p_tracking: v.tracking as string });
  const r = data as { ok?: boolean; code?: string; status?: string } | null;
  if (error || !r?.ok) return { ok: false, message: r?.code === "tracking_required" ? "Add the carrier and tracking number." : (error?.message ?? "That step isn't allowed right now.") };

  const o = await loadOrderForEmail(v.orderId);
  let message = "Updated";
  if (o && v.action === "ready" && o.storeName) {
    await notify({ channel: "email", to: o.email, template: "ready_for_pickup", subject: `Order ${o.number} is ready for pickup`, orderId: o.id,
      element: createElement(ReadyForPickup, { firstName: o.firstName, number: o.number, storeName: o.storeName, address: o.storeAddress ?? "", statusUrl: o.statusUrl }) });
    message = "Customer emailed: ready for pickup";
  }
  if (o && v.action === "ship") {
    await notify({ channel: "email", to: o.email, template: "shipped", subject: `Order ${o.number} has shipped`, orderId: o.id,
      element: createElement(Shipped, { firstName: o.firstName, number: o.number, carrier: o.trackingCarrier ?? "", tracking: o.trackingNumber ?? "", statusUrl: o.statusUrl }) });
    message = "Tracking emailed";
  }
  revalidatePath("/admin/orders");
  return { ok: true, message };
}
