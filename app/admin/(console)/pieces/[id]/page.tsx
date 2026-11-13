import { notFound } from "next/navigation";
import { updatePiece } from "@/actions/admin/pieces";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { PieceForm } from "@/components/admin/PieceForm";
import { PieceRowActions } from "@/components/admin/PieceRowActions";
import { requireStaff } from "@/lib/auth/staff";
import { photoUrl } from "@/lib/pieces/photos";
import { serverClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "Edit piece" };

export default async function EditPiece({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const sb = await serverClient();
  const { data: p } = await sb.from("pieces").select("*, piece_photos(id,path,source,position), piece_events(from_status,to_status,actor_label,reason,at)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: categories }, { data: stores }, { data: sellers }] = await Promise.all([
    sb.from("categories").select("id,name,measurement_kind").order("sort"), sb.from("stores").select("id,name").order("sort"), sb.from("sellers").select("id,name").eq("active", true).order("sort"),
  ]);
  const photos = [...p.piece_photos].sort((a, b) => a.position - b.position).map((x) => ({ id: x.id, url: photoUrl(x.path, x.source) }));
  const locked = p.status === "sold";

  return (
    <>
      <div className="ad-top"><h1>{p.title}</h1><span className={`pill ${p.status}`}>{p.status === "held" ? "In a bag" : p.status}</span></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><PieceRowActions id={p.id} status={p.status} />{p.status === "live" && <Link className="mini" style={{ display: "inline-flex", alignItems: "center" }} href={`/piece/${p.slug}`} target="_blank">View on shop</Link>}</div>
      <div style={{ maxWidth: 720, display: "grid", gap: 16 }}>
        <section className="panel"><div className="ph2"><h2>Photos</h2></div><div className="pbody"><PhotoManager pieceId={p.id} photos={photos} /></div></section>
        {locked ? <p className="mono">Sold pieces are frozen. Sold {p.sold_via === "in_store" ? "in store" : "online"} {p.sold_at ? new Date(p.sold_at).toLocaleString("en-CA") : ""}.</p> : (
          <PieceForm mode="edit" action={updatePiece.bind(null, p.id)} categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name, kind: c.measurement_kind }))} stores={stores ?? []} sellers={sellers ?? []} lockedStoreId={staff.role === "staff" ? staff.storeId : null}
            initial={{ title: p.title, categoryId: p.category_id, storeId: p.store_id, sellerId: p.seller_id ?? "", size: p.size, era: p.era, condition: p.condition, conditionNotes: p.condition_notes, authenticityNotes: p.authenticity_notes, description: p.description, priceDollars: p.price_is_placeholder ? "" : String(p.price_cents / 100), priceTbd: p.price_is_placeholder, measurements: (p.measurements ?? {}) as Record<string, unknown> }} />
        )}
        <section className="panel"><div className="ph2"><h2>History</h2></div><div className="pbody mono" style={{ fontSize: 12 }}>
          {[...p.piece_events].sort((a, b) => b.at.localeCompare(a.at)).map((e, i) => <div key={i}>{new Date(e.at).toLocaleString("en-CA")} · {e.from_status ?? "new"} → {e.to_status} · {e.actor_label}{e.reason ? ` · ${e.reason}` : ""}</div>)}
        </div></section>
      </div>
    </>
  );
}
