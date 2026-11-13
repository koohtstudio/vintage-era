import { notFound } from "next/navigation";
import { mockPay } from "@/actions/mock-pay";
import { isMock } from "@/lib/mode";
import { formatMoney } from "@/lib/money";
import { verifyOrderToken } from "@/lib/security/tokens";
import { serviceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function MockPayPage({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  if (!isMock) notFound();
  const signed = (await searchParams).o ?? "";
  const token = verifyOrderToken(signed);
  if (!token) notFound();
  const { data: order } = await serviceClient().from("orders").select("number,total_cents,status,order_items(title,price_cents)").eq("public_token", token).maybeSingle();
  if (!order) notFound();

  return (
    <main className="section" style={{ paddingTop: 50 }}>
      <div className="wrap" style={{ maxWidth: 520 }}>
        <p className="mono" style={{ background: "var(--color-pink)", border: "2px solid var(--color-ink)", borderRadius: 14, padding: 12, fontSize: 12 }}>
          MOCK PAYMENT. No card, no Stripe, no real money. In live mode this page is Stripe Checkout.
        </p>
        <h1 className="h2" style={{ margin: "24px 0 8px" }}>Pay</h1>
        <p className="mono">Order {order.number}</p>
        {order.order_items.map((i) => (
          <div className="sum" key={i.title} style={{ margin: "6px 0" }}><span>{i.title}</span><span>{formatMoney(i.price_cents)}</span></div>
        ))}
        <div className="sum" style={{ fontSize: 20, fontWeight: 700, margin: "14px 0 24px" }}><span>Total</span><span>{formatMoney(order.total_cents)}</span></div>
        <form action={mockPay.bind(null, signed)}>
          <button className="btn btn-lime" type="submit" style={{ width: "100%" }}>Pay {formatMoney(order.total_cents)}</button>
        </form>
      </div>
    </main>
  );
}
