import "server-only";
import { serviceClient } from "@/lib/supabase/admin";
import { signOrderToken } from "@/lib/security/tokens";
import { formatMoney } from "@/lib/money";

export interface OrderForEmail {
  id: string;
  number: string;
  status: string;
  fulfillment: "pickup" | "ship";
  firstName: string;
  email: string;
  phone: string | null;
  storeName: string | null;
  storeAddress: string | null;
  items: { title: string; priceCents: number; price: string }[];
  totalCents: number;
  total: string;
  statusUrl: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  paymentRef: string | null;
  paymentProvider: string;
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Server-only: everything needed to message a customer about an order. */
export async function loadOrderForEmail(orderId: string): Promise<OrderForEmail | null> {
  const db = serviceClient();
  const { data: o } = await db
    .from("orders")
    .select("*, customers(name,email,phone), stores(name,address), order_items(title,price_cents)")
    .eq("id", orderId)
    .single();
  if (!o) return null;
  const c = o.customers as { name: string; email: string; phone: string | null } | null;
  const s = o.stores as { name: string; address: string } | null;
  const items = (o.order_items as { title: string; price_cents: number }[]).map((i) => ({
    title: i.title,
    priceCents: i.price_cents,
    price: formatMoney(i.price_cents),
  }));
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    fulfillment: o.fulfillment,
    firstName: (c?.name ?? "").split(" ")[0] ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? null,
    storeName: s?.name ?? null,
    storeAddress: s?.address ?? null,
    items,
    totalCents: o.total_cents,
    total: formatMoney(o.total_cents),
    statusUrl: `${siteUrl()}/order/${signOrderToken(o.public_token)}`,
    trackingCarrier: o.tracking_carrier,
    trackingNumber: o.tracking_number,
    paymentRef: o.payment_ref,
    paymentProvider: o.payment_provider,
  };
}
