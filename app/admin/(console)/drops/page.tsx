import { cancelDrop, createDrop, openDropNow, sendDropAlertNow } from "@/actions/admin/owner";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { requireOwner } from "@/lib/auth/staff";
import { formatToronto } from "@/lib/time";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Drops" };

export default async function DropsPage() {
  await requireOwner();
  const sb = await serverClient();
  const [{ data: drops }, { data: drafts }] = await Promise.all([
    sb.from("drops").select("id,name,starts_at,status,released_at,alert_on_release,alert_sent_at,drop_pieces(piece_id,pieces(title))").neq("status", "cancelled").order("starts_at", { ascending: false }).limit(20),
    sb.from("pieces").select("id,title,size,stores(name),drop_pieces(drop_id)").eq("status", "draft").order("created_at", { ascending: false }),
  ]);
  const free = (drafts ?? []).filter((p) => !p.drop_pieces);

  return (
    <>
      <div className="ad-top"><h1>Drops</h1></div>
      <section className="panel"><div className="ph2"><h2>Schedule a drop</h2></div><div className="pbody">
        {free.length === 0 ? <p className="mono">No free drafts. Add pieces as drafts first (Save draft), then bundle them here.</p> : (
          <OwnerForm action={createDrop} submit="Schedule drop">
            <label>Name<input type="text" name="name" placeholder="Friday Night Drop" required /></label>
            <label>Goes live (Toronto time)<input type="datetime-local" name="startsAt" required /></label>
            <div className="lab">Pieces ({free.length} drafts available)
              <div style={{ display: "grid", gap: 6 }}>
                {free.map((p) => <label key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, textTransform: "none", letterSpacing: 0, font: "500 15px var(--font-sans)", minHeight: 44 }}><input type="checkbox" name="pieceIds" value={p.id} style={{ width: 22, height: 22 }} />{p.title} <span className="mono" style={{ fontSize: 12, color: "var(--color-mute)" }}>{p.size} · {(p.stores as { name: string } | null)?.name}</span></label>)}
              </div>
            </div>
            <label style={{ flexDirection: "row", alignItems: "center", gap: 10, textTransform: "none", letterSpacing: 0, font: "500 15px var(--font-sans)" }}><input type="checkbox" name="alert" style={{ width: 22, height: 22 }} />Email and text the drop alert list when it opens</label>
          </OwnerForm>
        )}
      </div></section>

      {(drops ?? []).map((d) => (
        <section className="panel" key={d.id}>
          <div className="ph2"><h2>{d.name}</h2><span className={`pill ${d.status === "live" ? "live" : "draft"}`}>{d.status}</span></div>
          <div className="pbody">
            <p style={{ margin: 0 }}>{d.status === "scheduled" ? "Goes live" : "Went live"} {formatToronto(d.released_at ?? d.starts_at)} · {(d.drop_pieces as unknown[]).length} pieces</p>
            <p className="mono" style={{ margin: 0, fontSize: 12 }}>{(d.drop_pieces as { pieces: { title: string } | null }[]).map((x) => x.pieces?.title).filter(Boolean).join(" · ")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {d.status === "scheduled" && <><form action={openDropNow.bind(null, d.id)}><button className="mini">Open it now</button></form><form action={cancelDrop.bind(null, d.id)}><button className="mini danger">Cancel</button></form></>}
              {d.status === "live" && d.alert_on_release && !d.alert_sent_at && <form action={sendDropAlertNow.bind(null, d.id)}><button className="mini">Send drop alert now</button></form>}
              {d.alert_sent_at && <span className="mono" style={{ fontSize: 12 }}>Alert sent {formatToronto(d.alert_sent_at)}</span>}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
