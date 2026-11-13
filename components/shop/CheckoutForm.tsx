"use client";

import { useActionState, useMemo, useState } from "react";
import { startCheckout, type CheckoutState } from "@/actions/checkout";
import type { BagLine } from "@/lib/bag";
import { displayPrice, formatMoney } from "@/lib/money";
import { HoldCountdown } from "./HoldCountdown";
import { Turnstile } from "./Turnstile";
import { useEffect } from "react";

const STORES = [
  { slug: "barrie", name: "Pick up in Barrie", note: "Georgian Mall, lower level" },
  { slug: "newmarket", name: "Pick up in Newmarket", note: "Upper Canada Mall" },
  { slug: "toronto", name: "Pick up in Toronto", note: "The Well" },
];
const initial: CheckoutState = { message: "" };

export function CheckoutForm({
  lines, shippingCents, shippingPlaceholder, taxRate, initialNow,
}: { lines: BagLine[]; shippingCents: number; shippingPlaceholder: boolean; taxRate: number; initialNow: number }) {
  const [state, action, pending] = useActionState(startCheckout, initial);
  const [mode, setMode] = useState<"pickup" | "ship">("pickup");
  const [store, setStore] = useState("barrie");
  const [now, setNow] = useState(initialNow);
  const nonce = useMemo(() => crypto.randomUUID(), []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const placeholder = lines.some((l) => l.pricePlaceholder) || (mode === "ship" && shippingPlaceholder);
  const subtotal = lines.reduce((s, l) => s + l.priceCents, 0);
  const ship = mode === "ship" ? shippingCents : 0;
  const tax = Math.round((subtotal + ship) * taxRate);
  const err = (k: string) => state.errors?.[k];

  const Field = ({ name, label, type = "text", auto, ph }: { name: string; label: string; type?: string; auto?: string; ph?: string }) => (
    <label className="field">
      {label}
      <input name={name} type={type} autoComplete={auto} placeholder={ph} aria-invalid={!!err(name)} />
      {err(name) && <span role="alert" style={{ color: "var(--color-hot)", textTransform: "none", letterSpacing: 0 }}>{err(name)}</span>}
    </label>
  );

  return (
    <form action={action} className="wrap" style={{ display: "grid", gap: 36, padding: "30px 16px 80px" }} noValidate>
      <input type="hidden" name="nonce" value={nonce} />
      <input type="hidden" name="fulfillment" value={mode} />
      {mode === "pickup" && <input type="hidden" name="store" value={store} />}
      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div style={{ display: "grid", gap: 28 }} className="checkout-grid">
        <div style={{ display: "grid", gap: 22 }}>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="kick">1 · Pickup or shipping</legend>
            <div className="opts">
              {STORES.map((s) => (
                <button type="button" key={s.slug} className="opt" aria-pressed={mode === "pickup" && store === s.slug} onClick={() => { setMode("pickup"); setStore(s.slug); }}>
                  <span><b>{s.name}</b><br /><small>{s.note}</small></span><b className="mono">Free</b>
                </button>
              ))}
              <button type="button" className="opt" aria-pressed={mode === "ship"} onClick={() => setMode("ship")}>
                <span><b>Ship it to me</b><br /><small>Canada Post, tracked</small></span>
                <b className="mono">{shippingPlaceholder ? "[rate]" : formatMoney(shippingCents)}</b>
              </button>
            </div>
            {err("store") && <p role="alert" style={{ color: "var(--color-hot)" }}>{err("store")}</p>}
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 14 }}>
            <legend className="kick">2 · About you</legend>
            <Field name="name" label="Name" auto="name" ph="First and last" />
            <Field name="email" label="Email" type="email" auto="email" ph="For your receipt" />
            <Field name="phone" label="Phone" type="tel" auto="tel" ph="So we can reach you" />
          </fieldset>

          {mode === "ship" && (
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 14 }}>
              <legend className="kick">Ship to</legend>
              <Field name="line1" label="Street address" auto="address-line1" />
              <Field name="line2" label="Apartment, suite (optional)" auto="address-line2" />
              <Field name="city" label="City" auto="address-level2" />
              <Field name="province" label="Province" auto="address-level1" ph="ON" />
              <Field name="postal" label="Postal code" auto="postal-code" ph="M5V 0A0" />
            </fieldset>
          )}
        </div>

        <aside style={{ border: "2px solid var(--color-ink)", borderRadius: 22, padding: 22, alignSelf: "start", display: "grid", gap: 12, boxShadow: "8px 8px 0 var(--color-pink)" }}>
          <p className="kick" style={{ margin: 0 }}>Your bag</p>
          {lines.map((l) => (
            <div key={l.pieceId} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span><b>{l.title}</b><br /><HoldCountdown expiresAt={l.expiresAt} now={now} /></span>
              <span className="mono">{displayPrice(l.priceCents, l.pricePlaceholder)}</span>
            </div>
          ))}
          <hr style={{ border: 0, borderTop: "2px solid var(--color-ink)", width: "100%" }} />
          <div className="sum"><span>Subtotal</span><span>{placeholder ? "[price total]" : formatMoney(subtotal)}</span></div>
          <div className="sum"><span>Shipping</span><span>{mode === "pickup" ? "Free" : shippingPlaceholder ? "[rate]" : formatMoney(ship)}</span></div>
          <div className="sum"><span>HST ({Math.round(taxRate * 100)}%)</span><span>{placeholder ? "[tax]" : formatMoney(tax)}</span></div>
          <div className="sum" style={{ fontSize: 18, fontWeight: 700 }}><span>Total</span><span>{placeholder ? "[price total]" : formatMoney(subtotal + ship + tax)}</span></div>
          <Turnstile />
          {state.message && <p role="alert" style={{ margin: 0, color: "var(--color-hot)", fontWeight: 700 }}>{state.message}</p>}
          <button className="btn btn-lime" type="submit" disabled={pending}>{pending ? "One sec…" : "Pay securely"}</button>
          <p className="mono" style={{ fontSize: 11, color: "var(--color-mute)", margin: 0 }}>
            Totals are confirmed on our server. We hold your pieces while you pay. If someone beats you to one, you&apos;re refunded in full.
          </p>
        </aside>
      </div>
    </form>
  );
}
