import { addReview, deleteReview, saveHomepage, toggleReview } from "@/actions/admin/owner";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { requireOwner } from "@/lib/auth/staff";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Homepage" };

export default async function HomepageAdmin() {
  await requireOwner();
  const sb = await serverClient();
  const [{ data: settings }, { data: pieces }, { data: reviews }] = await Promise.all([
    sb.from("settings").select("ticker_messages").single(),
    sb.from("pieces").select("id,title,size,featured_rank,status").in("status", ["live", "held"]).order("live_at", { ascending: false }),
    sb.from("reviews").select("*").order("sort"),
  ]);
  return (
    <>
      <div className="ad-top"><h1>Homepage</h1></div>
      <section className="panel"><div className="ph2"><h2>Ticker and featured pieces</h2></div><div className="pbody">
        <OwnerForm action={saveHomepage}>
          <label>Ticker messages (one per line)<textarea name="ticker" defaultValue={(settings?.ticker_messages ?? []).join("\n")} rows={6} style={{ minHeight: 140 }} /></label>
          <div className="lab">Featured pieces (show first in Fresh finds, up to 8)
            <div style={{ display: "grid", gap: 6 }}>
              {(pieces ?? []).map((p) => <label key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, textTransform: "none", letterSpacing: 0, font: "500 15px var(--font-sans)", minHeight: 44 }}><input type="checkbox" name="featured" value={p.id} defaultChecked={p.featured_rank !== null} style={{ width: 22, height: 22 }} />{p.title} <span className="mono" style={{ fontSize: 12, color: "var(--color-mute)" }}>{p.size}</span></label>)}
            </div>
          </div>
        </OwnerForm>
      </div></section>
      <section className="panel"><div className="ph2"><h2>Google reviews</h2></div><div className="pbody">
        <p className="mono" style={{ fontSize: 12, margin: 0 }}>Paste real reviews only. Unconfirmed ones never show on the live site.</p>
        {(reviews ?? []).map((r) => (
          <div className="ord" key={r.id}><p style={{ margin: 0 }}>“{r.quote}” <span className="mono" style={{ fontSize: 12 }}>{r.author}</span></p>
            <div style={{ display: "flex", gap: 8 }}><span className={`pill ${r.confirmed ? "live" : "draft"}`}>{r.confirmed ? "Confirmed" : "Unconfirmed"}</span>
              <form action={toggleReview.bind(null, r.id, !r.confirmed)}><button className="mini">{r.confirmed ? "Unconfirm" : "Mark confirmed"}</button></form>
              <form action={deleteReview.bind(null, r.id)}><button className="mini danger">Delete</button></form></div></div>
        ))}
        <OwnerForm action={addReview} submit="Add review"><label>Review text<textarea name="quote" required /></label><label>Reviewer (e.g. Jaz L.)<input type="text" name="author" /></label></OwnerForm>
      </div></section>
    </>
  );
}
