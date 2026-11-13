"use client";

import { useState, useTransition } from "react";
import { advanceOrder } from "@/actions/admin/orders";

export interface OrderRow {
  id: string; number: string; status: string; fulfillment: "pickup" | "ship"; storeName: string | null; storeId: string | null;
  customer: string; email: string; items: { title: string; storeName: string; storeId: string }[]; totalLabel: string; createdAt: string;
  tracking: string | null; city: string | null;
}

const NEXT: Record<string, { action: "bag" | "ready" | "pickup" | "pack" | "ship"; label: string } | undefined> = {
  "pickup:paid": { action: "bag", label: "Bagged it" },
  "pickup:bagged": { action: "ready", label: "Tell them it's ready" },
  "pickup:ready": { action: "pickup", label: "Picked up" },
  "ship:paid": { action: "pack", label: "Packed" },
  "ship:packed": { action: "ship", label: "Add tracking" },
};
const DONE: Record<string, string> = { bagged: "Bagged", ready: "Ready text sent", picked_up: "Done", packed: "Packed", shipped: "Shipped", refund_pending: "Refund pending", refunded: "Refunded", cancelled: "Cancelled", pending: "Awaiting payment" };

export function OrderCard({ o }: { o: OrderRow }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [carrier, setCarrier] = useState("Canada Post");
  const [tracking, setTracking] = useState("");
  const next = NEXT[`${o.fulfillment}:${o.status}`];
  const transfers = o.fulfillment === "pickup" ? o.items.filter((i) => i.storeId !== o.storeId) : [];
  const run = () => next && start(async () => { const r = await advanceOrder({ orderId: o.id, action: next.action, carrier, tracking }); setMsg(r.message); });

  return (
    <div className="ord">
      <div className="h"><b>{o.number}</b><span className="how">{o.fulfillment === "pickup" ? `Pickup · ${o.storeName}` : `Ship · ${o.city ?? "Canada Post"}`}</span></div>
      <p style={{ margin: 0 }}>{o.customer} · {o.items.map((i) => i.title).join(", ")}</p>
      <small className="mono">{o.totalLabel} · {new Date(o.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</small>
      {transfers.map((t) => <small key={t.title} className="mono" style={{ color: "var(--color-hot)", fontWeight: 700 }}>Transfer “{t.title}” from {t.storeName}</small>)}
      {next?.action === "ship" && (
        <div className="aform"><div className="f2"><label>Carrier<input type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} /></label><label>Tracking #<input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} /></label></div></div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {next && <button className="mini" disabled={pending || (next.action === "ship" && !tracking.trim())} onClick={run}>{next.action === "ship" ? "Shipped. Email tracking" : next.label}</button>}
        {!next && <span className="mono" style={{ fontWeight: 700, fontSize: 12, color: o.status.startsWith("refund") ? "var(--color-hot)" : "#2E7D17" }}>{DONE[o.status] ?? o.status}</span>}
        {o.tracking && <span className="mono" style={{ fontSize: 12 }}>Tracking {o.tracking}</span>}
        {msg && <span className="mono" role="status" style={{ fontSize: 12 }}>{msg}</span>}
      </div>
    </div>
  );
}
