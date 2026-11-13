"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";

export interface OrderView {
  number: string;
  status: string;
  fulfillment: "pickup" | "ship";
  store: { slug: string; name: string; address: string } | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  total_cents: number;
  first_name: string;
  email_hint: string;
  items: { title: string; price_cents: number; slug: string; cover_path: string | null; cover_source: "public" | "storage" | null; cover_blur: string | null }[];
}

const STEPS = {
  pickup: [["paid", "Paid"], ["bagged", "Bagged"], ["ready", "Ready for pickup"], ["picked_up", "Picked up"]],
  ship: [["paid", "Paid"], ["packed", "Packed"], ["shipped", "Shipped"]],
} as const;

const photo = (p: string | null, s: "public" | "storage" | null) => (!p ? null : s === "storage" ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/piece-photos/${p}` : p);

/** Live order status: Realtime broadcast on an unguessable topic, with a 10 s poll as a safety net. */
export function OrderLive({ initial, rawToken, signedToken }: { initial: OrderView; rawToken: string; signedToken: string }) {
  const [order, setOrder] = useState(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let stop = false;
    const apply = (next: Partial<OrderView>) => { setOrder((o) => ({ ...o, ...next })); setPulse(true); setTimeout(() => setPulse(false), 1500); };
    const poll = async () => {
      const r = await fetch(`/api/order?t=${encodeURIComponent(signedToken)}`, { cache: "no-store" });
      if (r.ok && !stop) { const j = (await r.json()) as { order: OrderView | null }; if (j.order) setOrder((o) => (o.status !== j.order!.status || o.tracking_number !== j.order!.tracking_number ? j.order! : o)); }
    };
    const t = setInterval(poll, 10000);
    let cleanup = () => {};
    void import("@/lib/supabase/client").then(({ browserClient }) => {
      if (stop) return;
      const sb = browserClient();
      const ch = sb.channel(`order:${rawToken}`).on("broadcast", { event: "status" }, ({ payload }) => {
        const p = payload as { status: string; tracking_carrier: string | null; tracking_number: string | null };
        apply({ status: p.status, tracking_carrier: p.tracking_carrier, tracking_number: p.tracking_number });
      }).subscribe();
      cleanup = () => void sb.removeChannel(ch);
    });
    return () => { stop = true; clearInterval(t); cleanup(); };
  }, [rawToken, signedToken]);

  const steps = STEPS[order.fulfillment];
  const idx = steps.findIndex(([s]) => s === order.status);
  const bad = ["refund_pending", "refunded", "cancelled"].includes(order.status);

  return (
    <div className="wrap" style={{ maxWidth: 680, padding: "40px 16px 90px" }}>
      <p className="kick">Order {order.number}</p>
      {order.status === "pending" ? (
        <>
          <h1 className="h2">Confirming…</h1>
          <p role="status">We&apos;re confirming your payment. This page updates by itself.</p>
        </>
      ) : bad ? (
        <>
          <h1 className="h2">Sorry about that.</h1>
          <p role="status" style={{ lineHeight: 1.6 }}>
            {order.status === "cancelled"
              ? "This order was cancelled and nothing was charged."
              : "Someone else got that piece a moment before your payment landed. Every piece is one of one. We've refunded you in full and emailed you the details."}
          </p>
          <Link className="btn btn-lime" href="/shop">Back to the shop</Link>
        </>
      ) : (
        <>
          <h1 className="h2">It&apos;s yours, <span className="g">{order.first_name || "friend"}.</span></h1>
          <ol className={pulse ? "flash-in" : ""} style={{ listStyle: "none", padding: 0, margin: "26px 0", display: "grid", gap: 10 }} aria-label="Order progress">
            {steps.map(([s, label], i) => (
              <li key={s} aria-current={i === idx ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 14, border: "2px solid var(--color-ink)", borderRadius: 16, padding: "12px 16px", background: i < idx ? "var(--color-lime)" : i === idx ? "var(--color-pink)" : "#fff", opacity: i > idx ? 0.55 : 1 }}>
                <span className="mono" style={{ fontWeight: 700 }}>{i <= idx ? "✓" : i + 1}</span>
                <b>{label}</b>
              </li>
            ))}
          </ol>
          {order.fulfillment === "pickup" && order.store && <p>Pickup at <b>{order.store.name}</b>. {order.store.address}</p>}
          {order.fulfillment === "ship" && order.tracking_number && <p>Tracking: <b>{order.tracking_carrier}</b> {order.tracking_number}</p>}
          <p className="mono" style={{ fontSize: 13, color: "var(--color-mute)" }}>We emailed updates to {order.email_hint}.</p>
        </>
      )}
      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        {order.items.map((i) => {
          const src = photo(i.cover_path, i.cover_source);
          return (
            <div key={i.slug} className="line">
              <div className="th">{src ? <Image src={src} alt="" fill sizes="64px" placeholder={i.cover_blur ? "blur" : "empty"} blurDataURL={i.cover_blur ?? undefined} style={{ objectFit: "cover" }} /> : null}</div>
              <div><b>{i.title}</b><small>{formatMoney(i.price_cents)}</small></div>
            </div>
          );
        })}
        <div className="sum" style={{ fontWeight: 700 }}><span>Total paid</span><span>{formatMoney(order.total_cents)}</span></div>
      </div>
    </div>
  );
}
