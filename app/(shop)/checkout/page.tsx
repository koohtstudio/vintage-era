import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { loadBag } from "@/lib/bag";
import { getSettings } from "@/lib/pieces/queries";
import { getShopperSession } from "@/lib/security/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const sid = await getShopperSession();
  const [lines, settings] = await Promise.all([sid ? loadBag(sid) : Promise.resolve([]), getSettings()]);

  return (
    <main className="section" style={{ paddingTop: 40, paddingBottom: 0 }}>
      <div className="wrap">
        <p className="kick">Almost yours</p>
        <h1 className="h2">Checkout</h1>
      </div>
      {lines.length === 0 ? (
        <div className="wrap" style={{ padding: "50px 16px 90px", textAlign: "center" }}>
          <p className="display" style={{ fontSize: 40, margin: 0 }}>Bag&apos;s empty</p>
          <p>Holds last {settings.hold_minutes} minutes. If yours ran out, the piece is back on the rack.</p>
          <Link className="btn btn-lime" href="/shop">Back to the shop</Link>
        </div>
      ) : (
        <CheckoutForm lines={lines} shippingCents={settings.shipping_flat_cents} shippingPlaceholder={settings.shipping_is_placeholder} taxRate={Number(settings.tax_rate)} initialNow={Date.now()} />
      )}
    </main>
  );
}
