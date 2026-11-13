import { saveSeller, toggleSeller } from "@/actions/admin/owner";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { requireOwner } from "@/lib/auth/staff";
import { formatMoney } from "@/lib/money";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Sellers" };

export default async function SellersPage() {
  await requireOwner();
  const sb = await serverClient();
  const [{ data: sellers }, { data: sold }] = await Promise.all([
    sb.from("sellers").select("*").order("sort"),
    sb.from("order_items").select("seller_id,price_cents").eq("committed", true),
  ]);
  const online = new Map<string, { n: number; cents: number }>();
  for (const i of sold ?? []) if (i.seller_id) { const c = online.get(i.seller_id) ?? { n: 0, cents: 0 }; c.n++; c.cents += i.price_cents; online.set(i.seller_id, c); }
  return (
    <>
      <div className="ad-top"><h1>Sellers</h1></div>
      <section className="panel"><div className="ph2"><h2>The collective</h2><span className="mono" style={{ fontSize: 12 }}>Online sales per seller</span></div><div className="pbody">
        {(sellers ?? []).map((s) => (
          <div className="ord" key={s.id}>
            <OwnerForm action={saveSeller} submit="Save">
              <input type="hidden" name="id" value={s.id} />
              <div className="f2"><label>Name<input type="text" name="name" defaultValue={s.name} /></label><label>Instagram handle<input type="text" name="instagram" defaultValue={s.instagram} /></label></div>
            </OwnerForm>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 12 }}>{online.get(s.id)?.n ?? 0} sold online · {formatMoney(online.get(s.id)?.cents ?? 0)}</span>
              {s.is_placeholder && <span className="pill held">Placeholder</span>}
              <form action={toggleSeller.bind(null, s.id, !s.active)}><button className="mini">{s.active ? "Hide from site" : "Show on site"}</button></form>
            </div>
          </div>
        ))}
        <h3 style={{ margin: "10px 0 0" }}>Add a seller</h3>
        <OwnerForm action={saveSeller} submit="Add"><div className="f2"><label>Name<input type="text" name="name" required /></label><label>Instagram handle<input type="text" name="instagram" /></label></div></OwnerForm>
      </div></section>
    </>
  );
}
