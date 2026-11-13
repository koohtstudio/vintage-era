"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { isMock } from "@/lib/mode";
import { handlePaymentSucceeded } from "@/lib/payments/finalize";
import { verifyOrderToken } from "@/lib/security/tokens";
import { serviceClient } from "@/lib/supabase/admin";

/** MOCK ONLY: plays the role of Stripe's webhook. Runs the very same finalize path. */
export async function mockPay(signedToken: string) {
  if (!isMock) throw new Error("Mock payments are disabled in live mode");
  const token = verifyOrderToken(signedToken);
  if (!token) redirect("/");
  const { data: order } = await serviceClient().from("orders").select("id").eq("public_token", token).maybeSingle();
  if (!order) redirect("/");
  await handlePaymentSucceeded({ orderId: order.id, paymentRef: `mock_${randomUUID()}` });
  redirect(`/order/${signedToken}`);
}
