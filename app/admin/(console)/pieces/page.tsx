import Image from "next/image";
import Link from "next/link";
import { PieceRowActions } from "@/components/admin/PieceRowActions";
import { requireStaff } from "@/lib/auth/staff";
import { conditionLabel } from "@/lib/catalog/options";
import { displayPrice } from "@/lib/money";
import { photoUrl } from "@/lib/pieces/photos";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Pieces" };
type SP = { status?: string; store?: string; seller?: string; type?: string; added?: string };

export default async function PiecesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const sb = await serverClient();

  let q = sb.from("pieces").select("id,slug,title,size,condition,status,price_cents,price_is_placeholder,store_id,seller_id,category_id,live_at,created_at,stores(name),sellers(name),categories(name),piece_photos(path,source,position)").order("created_at", { ascending: false }).limit(150);
  if (sp.status && ["draft", "live", "held", "sold", "archived"].includes(sp.status)) q = q.eq("status", sp.status as "live");
  if (sp.store) q = q.eq("store_id", sp.store);
  if (sp.seller) q = q.eq("seller_id", sp.seller);
  if (sp.type) q = q.eq("category_id", sp.type);
  const [{ data: rows }, { data: stores }, { data: sellers }, { data: cats }] = await Promise.all([
    q, sb.from("stores").select("id,name").order("sort"), sb.from("sellers").select("id,name").order("sort"), sb.from("categories").select("id,name").order("sort"),
  ]);

  const href = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch } as Record<string, string | undefined>;
    const qs = new URLSearchParams(Object.entries(next).filter(([k, v]) => v && k !== "added") as [string, string][]).toString();
    return `/admin/pieces${qs ? `?${qs}` : ""}`;
  };
  const Chip = ({ k, v, label }: { k: keyof SP; v: string; label: string }) => (
    <Link className="ad-chip" href={href({ [k]: sp[k] === v ? undefined : v })} aria-current={sp[k] === v}>{label}</Link>
  );

  return (
    <>
      <div className="ad-top"><h1>Pieces</h1><Link className="btn btn-lime" href="/admin/pieces/new">+ Add a piece</Link></div>
      <section className="panel">
        <div className="ph2" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div className="chips"><b className="mono" style={{ fontSize: 11 }}>STATUS</b>{["live", "held", "draft", "sold", "archived"].map((s) => <Chip key={s} k="status" v={s} label={s[0]!.toUpperCase() + s.slice(1)} />)}</div>
          {staff.role === "owner" && <div className="chips"><b className="mono" style={{ fontSize: 11 }}>STORE</b>{(stores ?? []).map((s) => <Chip key={s.id} k="store" v={s.id} label={s.name} />)}</div>}
          <div className="chips"><b className="mono" style={{ fontSize: 11 }}>TYPE</b>{(cats ?? []).map((c) => <Chip key={c.id} k="type" v={c.id} label={c.name} />)}</div>
          <div className="chips"><b className="mono" style={{ fontSize: 11 }}>SELLER</b>{(sellers ?? []).map((s) => <Chip key={s.id} k="seller" v={s.id} label={s.name} />)}</div>
        </div>
        <div>
          {(rows ?? []).length === 0 && <p style={{ padding: 20 }} className="mono">Nothing matches.</p>}
          {(rows ?? []).map((p) => {
            const cover = [...p.piece_photos].sort((a, b) => a.position - b.position)[0];
            return (
              <div className="arow" key={p.id}>
                <div className="th">{cover && <Image src={photoUrl(cover.path, cover.source)} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />}</div>
                <div style={{ minWidth: 0 }}>
                  <b><Link href={`/admin/pieces/${p.id}`}>{p.title}</Link></b>
                  <small>{(p.categories as { name: string } | null)?.name} · {p.size} · {conditionLabel(p.condition)} · {(p.stores as { name: string } | null)?.name} · {(p.sellers as { name: string } | null)?.name ?? "No seller"}</small><br />
                  <span className={`pill ${p.status}`}>{p.status === "held" ? "In a bag" : p.status}</span>{" "}
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{displayPrice(p.price_cents, p.price_is_placeholder)}</span>
                </div>
                <div className="acts"><Link className="mini" style={{ display: "inline-flex", alignItems: "center" }} href={`/admin/pieces/${p.id}`}>Edit</Link><PieceRowActions id={p.id} status={p.status} /></div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
