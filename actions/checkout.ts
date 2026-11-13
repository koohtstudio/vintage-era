"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loadBag } from "@/lib/bag";
import { verifyCaptcha } from "@/lib/captcha";
import { payments } from "@/lib/payments";
import { clientIpHash, rateLimit } from "@/lib/ratelimit";
import { getShopperSession } from "@/lib/security/session";
import { hashId } from "@/lib/security/tokens";
import { serviceClient } from "@/lib/supabase/admin";
import { isMock } from "@/lib/mode";

export interface CheckoutState {
  message: string;
  errors?: Record<string, string>;
}

const postal = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

const schema = z
  .object({
    nonce: z.string().min(8).max(64),
    fulfillment: z.enum(["pickup", "ship"]),
    store: z.enum(["barrie", "newmarket", "toronto"]).optional(),
    name: z.string().trim().min(2, "Add your name").max(80),
    email: z.string().trim().email("That email doesn't look right").max(120),
    phone: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 10, "Add a phone number we can reach").max(30),
    line1: z.string().trim().max(100).optional(),
    line2: z.string().trim().max(100).optional(),
    city: z.string().trim().max(60).optional(),
    province: z.string().trim().max(30).optional(),
    postal: z.string().trim().max(10).optional(),
    company: z.string().max(0), // honeypot
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "pickup" && !v.store) ctx.addIssue({ code: "custom", path: ["store"], message: "Pick a store" });
    if (v.fulfillment === "ship") {
      if (!v.line1) ctx.addIssue({ code: "custom", path: ["line1"], message: "Add a street address" });
      if (!v.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Add a city" });
      if (!v.province) ctx.addIssue({ code: "custom", path: ["province"], message: "Add a province" });
      if (!v.postal || !postal.test(v.postal)) ctx.addIssue({ code: "custom", path: ["postal"], message: "Canadian postal code, e.g. M5V 0A0" });
    }
  });

/**
 * Starts payment. Nothing the browser sends is trusted for money: totals are recomputed inside
 * create_pending_order() from the held pieces and settings in the database.
 */
export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const raw = Object.fromEntries(form.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    if (raw.company) return { message: "Something went wrong. Try again." };
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Check the highlighted fields.", errors };
  }
  const v = parsed.data;

  const sid = await getShopperSession();
  if (!sid) return { message: "Your bag is empty or has expired." };

  const [a, b] = await Promise.all([rateLimit(`checkout:s:${sid}`, 8, 600), rateLimit(`checkout:ip:${await clientIpHash()}`, 20, 600)]);
  if (!a.ok || !b.ok) return { message: "Too many attempts. Give it a minute." };
  if (!(await verifyCaptcha(form.get("cf-turnstile-response") as string | null))) return { message: "Couldn't verify you're human. Try again." };

  const bag = await loadBag(sid);
  if (bag.length === 0) return { message: "Your holds ran out. The pieces are back on the rack." };

  const db = serviceClient();
  await db.rpc("extend_holds_for_checkout", { p_session: sid, p_minutes: 30 });

  const provider = payments();
  const idem = hashId(`${sid}:${v.nonce}:${bag.map((l) => l.pieceId).sort().join(",")}`);
  const { data, error } = await db.rpc("create_pending_order", {
    p_session: sid,
    p_fulfillment: v.fulfillment,
    p_store_slug: v.store ?? "",
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone,
    p_ship_address: v.fulfillment === "ship" ? { name: v.name, line1: v.line1, line2: v.line2 ?? "", city: v.city, province: v.province, postal: v.postal!.toUpperCase(), country: "CA" } : (null as never),
    p_idempotency_key: idem,
    p_provider: provider.name,
  });
  const o = data as unknown as { ok: boolean; code?: string; order_id: string; number: string; public_token: string; total_cents: number; subtotal_cents: number; shipping_cents: number; tax_cents: number };
  if (error || !o?.ok) return { message: o?.code === "empty" ? "Your holds ran out. The pieces are back on the rack." : "Couldn't start checkout. Try again." };

  let url: string;
  try {
    ({ redirectUrl: url } = await provider.createCheckout({
      id: o.order_id, number: o.number, publicToken: o.public_token, email: v.email,
      subtotalCents: o.subtotal_cents, shippingCents: o.shipping_cents, taxCents: o.tax_cents, totalCents: o.total_cents,
      items: bag.map((l) => ({ title: l.title, priceCents: l.priceCents })),
    }));
  } catch {
    return { message: isMock ? "Couldn't start the mock payment." : "Couldn't reach the payment provider. Try again." };
  }
  redirect(url);
}
