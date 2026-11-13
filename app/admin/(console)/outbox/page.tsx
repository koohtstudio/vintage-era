import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { isMock } from "@/lib/mode";
import { formatToronto } from "@/lib/time";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Outbox" };

export default async function OutboxPage() {
  if (!isMock) notFound();
  await requireStaff();
  const sb = await serverClient();
  const { data } = await sb.from("notifications_log").select("id,channel,template,to_address,subject,body_html,status,created_at").order("created_at", { ascending: false }).limit(40);
  return (
    <>
      <div className="ad-top"><h1>Outbox</h1><span className="mono" style={{ fontSize: 12 }}>MOCK MODE: emails and texts land here instead of being sent</span></div>
      {(data ?? []).length === 0 && <p className="mono">Nothing yet. Place an order or sign up for drop alerts on the shop.</p>}
      {(data ?? []).map((m) => (
        <details className="panel" key={m.id}>
          <summary className="ph2" style={{ cursor: "pointer" }}><span><b>{m.subject || m.template}</b><br /><small className="mono">{m.channel} · to {m.to_address} · {formatToronto(m.created_at)}</small></span><span className="pill draft">{m.status}</span></summary>
          {m.channel === "email" ? <iframe title={m.subject} sandbox="" srcDoc={m.body_html} style={{ width: "100%", height: 520, border: 0 }} /> : <p className="pbody">{m.body_html}</p>}
        </details>
      ))}
    </>
  );
}
