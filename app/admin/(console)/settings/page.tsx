import { saveSettings } from "@/actions/admin/owner";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { requireOwner } from "@/lib/auth/staff";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };
const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]] as const;

export default async function SettingsPage() {
  await requireOwner();
  const sb = await serverClient();
  const [{ data: s }, { data: stores }] = await Promise.all([sb.from("settings").select("*").single(), sb.from("stores").select("*").order("sort")]);
  if (!s) return null;
  return (
    <>
      <div className="ad-top"><h1>Settings</h1></div>
      <OwnerForm action={saveSettings} submit="Save all settings" className="aform">
        <section className="panel"><div className="ph2"><h2>Shop</h2></div><div className="pbody aform">
          <div className="f2"><label>Hold length (minutes)<input type="number" name="hold_minutes" defaultValue={s.hold_minutes} min={1} max={120} /></label><label>Max holds per shopper<input type="number" name="max_holds" defaultValue={s.max_holds_per_session} min={1} max={50} /></label></div>
          <div className="f2"><label>Flat shipping rate ($)<input type="number" step="0.01" name="shipping" defaultValue={s.shipping_flat_cents / 100} /></label><label>HST (%)<input type="number" step="0.1" name="tax" defaultValue={Number(s.tax_rate) * 100} /></label></div>
          <label style={{ flexDirection: "row", gap: 10, alignItems: "center", textTransform: "none", letterSpacing: 0, font: "500 15px var(--font-sans)" }}><input type="checkbox" name="shipping_placeholder" defaultChecked={s.shipping_is_placeholder} style={{ width: 22, height: 22 }} />Still showing [rate] (shipping not confirmed)</label>
          <label>Show sold pieces for (days)<input type="number" name="sold_days" defaultValue={s.sold_visible_days} min={0} max={30} /></label>
          <div className="f2"><label>Google rating<input type="text" name="rating" defaultValue={s.google_rating ?? ""} /></label><label>Google review count<input type="text" name="reviews" defaultValue={s.google_review_count ?? ""} /></label></div>
          <label style={{ flexDirection: "row", gap: 10, alignItems: "center", textTransform: "none", letterSpacing: 0, font: "500 15px var(--font-sans)" }}><input type="checkbox" name="allow_placeholder" defaultChecked={s.allow_placeholder_prices} style={{ width: 22, height: 22 }} />Allow pieces with a placeholder [price] to go live (turn OFF before launch)</label>
        </div></section>
        {(stores ?? []).map((st) => {
          const h = (st.hours ?? {}) as Record<string, [string, string] | undefined>;
          return (
            <section className="panel" key={st.id}><div className="ph2"><h2>{st.name} hours</h2><span className={`pill ${st.hours_confirmed ? "live" : "held"}`}>{st.hours_confirmed ? "Confirmed" : "Confirm me"}</span></div><div className="pbody aform">
              {DAYS.map(([d, label]) => (
                <div key={d} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                  <b className="mono" style={{ paddingBottom: 14 }}>{label}</b>
                  <label>Open<input type="text" name={`${st.slug}_${d}_open`} defaultValue={h[d]?.[0] ?? ""} placeholder="09:30" /></label>
                  <label>Close<input type="text" name={`${st.slug}_${d}_close`} defaultValue={h[d]?.[1] ?? ""} placeholder="21:00" /></label>
                  <label style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingBottom: 12 }}><input type="checkbox" name={`${st.slug}_${d}_closed`} defaultChecked={!h[d]} style={{ width: 20, height: 20 }} />Closed</label>
                </div>
              ))}
            </div></section>
          );
        })}
      </OwnerForm>
    </>
  );
}
