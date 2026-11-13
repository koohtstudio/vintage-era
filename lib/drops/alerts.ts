import "server-only";
import { createElement } from "react";
import DropAlert from "@/emails/DropAlert";
import { notify } from "@/lib/notify";
import { siteUrl } from "@/lib/orders/queries";
import { serviceClient } from "@/lib/supabase/admin";

/** Sends the drop alert to every opted-in subscriber, once (alert_sent_at is the lock). CASL footer in every email. */
export async function sendDropAlert(dropId: string): Promise<{ sent: number }> {
  const db = serviceClient();
  const { data: claimed } = await db.from("drops").update({ alert_sent_at: new Date().toISOString() }).eq("id", dropId).is("alert_sent_at", null).select("name").maybeSingle();
  if (!claimed) return { sent: 0 };

  const { data: pieces } = await db.from("drop_pieces").select("pieces(title)").eq("drop_id", dropId);
  const titles = (pieces ?? []).map((p) => (p.pieces as unknown as { title: string } | null)?.title).filter((t): t is string => !!t);
  const { data: subs } = await db.from("subscribers").select("email,phone,unsubscribe_token").is("unsubscribed_at", null);

  let sent = 0;
  for (const s of subs ?? []) {
    const unsub = `${siteUrl()}/unsubscribe/${s.unsubscribe_token}`;
    if (s.email) {
      await notify({
        channel: "email", to: s.email, template: "drop_alert", subject: `${claimed.name} just dropped`,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        element: createElement(DropAlert, { dropName: claimed.name, pieceTitles: titles, shopUrl: `${siteUrl()}/shop`, unsubscribeUrl: unsub }),
      });
      sent++;
    } else if (s.phone) {
      await notify({ channel: "sms", to: s.phone, template: "drop_alert_sms", text: `Era Vintage: ${claimed.name} just dropped. ${siteUrl()}/shop Reply STOP to unsubscribe.` });
      sent++;
    }
  }
  return { sent };
}
