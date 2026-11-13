import Link from "next/link";
import { OrderCard, type OrderRow } from "@/components/admin/OrderCard";
import { requireStaff } from "@/lib/auth/staff";
import { formatMoney } from "@/lib/money";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Online orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff();
  const tab = (await searchParams).tab ?? "todo";
  const sb = await serverClient();
  const { data } = await sb.from("orders").select("id,number,status,fulfillment,store_id,ship_address,tracking_carrier,tracking_number,total_cents,created_at,customers(name,email),stores(name),order_items(title,store_id,stores(name))").neq("status", "pending").order("created_at", { ascending: false }).limit(100);

  const groups = { todo: ["paid", "bagged", "ready", "packed"], done: ["picked_up", "shipped"], problems: ["refund_pending", "refunded", "cancelled"] } as const;
  const rows: OrderRow[] = (data ?? []).filter((o) => (groups[tab as keyof typeof groups] ?? groups.todo).includes(o.status as never)).map((o) => ({
    id: o.id, number: o.number, status: o.status, fulfillment: o.fulfillment, storeId: o.store_id, storeName: (o.stores as { name: string } | null)?.name ?? null,
    customer: (o.customers as { name: string } | null)?.name ?? "", email: (o.customers as { email: string } | null)?.email ?? "",
    items: o.order_items.map((i) => ({ title: i.title, storeId: i.store_id, storeName: (i.stores as { name: string } | null)?.name ?? "" })),
    totalLabel: formatMoney(o.total_cents), createdAt: o.created_at, tracking: o.tracking_number ? `${o.tracking_carrier ?? ""} ${o.tracking_number}` : null,
    city: (o.ship_address as { city?: string } | null)?.city ?? null,
  }));

  return (
    <>
      <div className="ad-top"><h1>Online orders</h1></div>
      <section className="panel">
        <div className="ph2"><h2>Orders</h2>
          <div className="chips">{[["todo", "To do"], ["done", "Done"], ["problems", "Refunds"]].map(([k, l]) => <Link key={k} className="ad-chip" href={`/admin/orders?tab=${k}`} aria-current={tab === k}>{l}</Link>)}</div>
        </div>
        <div className="pbody">
          {rows.length === 0 && <p className="mono">Nothing here. New online orders show up instantly.</p>}
          {rows.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>
      </section>
    </>
  );
}
