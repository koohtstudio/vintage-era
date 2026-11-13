import { requireOwner } from "@/lib/auth/staff";
import { formatToronto } from "@/lib/time";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Drop alerts list" };

export default async function SubscribersPage() {
  await requireOwner();
  const sb = await serverClient();
  const { data } = await sb.from("subscribers").select("*").order("consent_at", { ascending: false }).limit(500);
  const active = (data ?? []).filter((s) => !s.unsubscribed_at).length;
  return (
    <>
      <div className="ad-top"><h1>Drop alerts list</h1><a className="btn btn-ink" href="/api/subscribers/export">Export CSV</a></div>
      <section className="panel"><div className="ph2"><h2>{active} subscribed · {(data ?? []).length - active} unsubscribed</h2></div>
        <div className="scroll-x"><table className="ad-table"><thead><tr><th>Contact</th><th>Source</th><th>Consent given</th><th>Status</th></tr></thead><tbody>
          {(data ?? []).map((s) => <tr key={s.id}><td>{s.email ?? s.phone}</td><td>{s.source}</td><td className="mono" style={{ fontSize: 12 }}>{formatToronto(s.consent_at)}</td><td>{s.unsubscribed_at ? <span className="pill draft">Unsubscribed</span> : <span className="pill live">Subscribed</span>}</td></tr>)}
        </tbody></table></div>
      </section>
      <p className="mono" style={{ fontSize: 12 }}>Every row stores the exact consent wording, time and a hashed IP (CASL). Every message carries an unsubscribe link.</p>
    </>
  );
}
