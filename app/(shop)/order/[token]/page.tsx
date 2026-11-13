import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderLive, type OrderView } from "@/components/shop/OrderLive";
import { verifyOrderToken } from "@/lib/security/tokens";
import { serviceClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const signed = decodeURIComponent((await params).token);
  const token = verifyOrderToken(signed);
  if (!token) notFound();
  const { data } = await serviceClient().rpc("get_order_by_token", { p_token: token });
  if (!data) notFound();
  return (
    <main>
      <OrderLive initial={data as unknown as OrderView} rawToken={token} signedToken={signed} />
    </main>
  );
}
