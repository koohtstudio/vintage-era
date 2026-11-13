import "server-only";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { isMock } from "@/lib/mode";
import { serverEnv } from "@/lib/env";
import { serviceClient } from "@/lib/supabase/admin";

export interface SendEmailInput {
  to: string;
  template: string;
  subject: string;
  element: ReactElement;
  orderId?: string;
  /** e.g. List-Unsubscribe for CASL */
  headers?: Record<string, string>;
}

/**
 * Every email goes through here and is logged to notifications_log.
 * mock: stays in the log as 'outbox' (shown at /admin/outbox) and nothing leaves the machine.
 * live: sent with Resend; the log row records sent/failed.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id: string }> {
  const html = await render(input.element);
  const db = serviceClient();
  const { data: row, error } = await db
    .from("notifications_log")
    .insert({
      channel: "email",
      template: input.template,
      to_address: input.to,
      subject: input.subject,
      body_html: html,
      status: "outbox",
      order_id: input.orderId ?? null,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(`could not log email: ${error?.message}`);
  if (isMock) return { ok: true, id: row.id };

  const env = serverEnv();
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const res = await resend.emails.send({ from: env.EMAIL_FROM, to: input.to, subject: input.subject, html, headers: input.headers });
    if (res.error) throw new Error(res.error.message);
    await db.from("notifications_log").update({ status: "sent", provider_id: res.data?.id ?? null }).eq("id", row.id);
    return { ok: true, id: row.id };
  } catch (e) {
    await db.from("notifications_log").update({ status: "failed", error: e instanceof Error ? e.message : String(e) }).eq("id", row.id);
    return { ok: false, id: row.id };
  }
}
