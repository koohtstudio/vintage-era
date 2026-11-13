import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaff();
  const denied = (await searchParams).denied;
  const sb = await serverClient();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [live, held, toPack, sold, drop] = await Promise.all([
    sb.from("pieces").select("id", { count: "exact", head: true }).eq("status", "live"),
    sb.from("pieces").select("id", { count: "exact", head: true }).eq("status", "held"),
    sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "bagged", "packed"]),
    sb.from("pieces").select("id", { count: "exact", head: true }).eq("status", "sold").eq("sold_via", "online").gte("sold_at", weekAgo),
    sb.from("drops").select("name,starts_at").eq("status", "scheduled").order("starts_at").limit(1).maybeSingle(),
  ]);
  return (
    <>
      <div className="ad-top"><h1>Rack to site.</h1><div style={{ display: "flex", gap: 10 }}>{staff.role === "owner" && <Link className="btn btn-white" href="/admin/drops">Schedule a drop</Link>}<Link className="btn btn-ink" href="/admin/pieces/new">+ Add a piece</Link></div></div>
      {denied && <p role="alert" className="mono" style={{ color: "var(--color-hot)" }}>That page is for owners only.</p>}
      <div className="ad-stats">
        <div className="ad-stat"><small>Live on site</small><b>{live.count ?? 0}</b></div>
        <div className="ad-stat"><small>Orders to pack</small><b>{toPack.count ?? 0}</b></div>
        <div className="ad-stat"><small>Sold online this week</small><b>{sold.count ?? 0}</b></div>
        <div className="ad-stat" style={{ background: "#fff" }}><small>In bags now</small><b>{held.count ?? 0}</b></div>
      </div>
      <section className="panel"><div className="ph2"><h2>Next drop</h2></div><div className="pbody">
        {drop.data ? <p style={{ margin: 0 }}><b>{drop.data.name}</b> · {new Date(drop.data.starts_at).toLocaleString("en-CA", { dateStyle: "full", timeStyle: "short", timeZone: "America/Toronto" })}</p> : <p style={{ margin: 0 }}>No drop scheduled.</p>}
      </div></section>
      <section className="panel"><div className="ph2"><h2>Jump to</h2></div><div className="pbody" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Link className="btn btn-lime" href="/admin/orders">Online orders</Link><Link className="btn btn-white" href="/admin/pieces?status=draft">Drafts</Link><Link className="btn btn-white" href="/admin/pieces?status=held">In bags</Link>
      </div></section>
    </>
  );
}
