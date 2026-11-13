import "server-only";
import type { ReactElement } from "react";
import { sendEmail, type SendEmailInput } from "@/lib/email";
import { isMock } from "@/lib/mode";
import { serviceClient } from "@/lib/supabase/admin";

/**
 * One entry point for customer messaging. Email goes through lib/email (Resend / outbox).
 * SMS is an adapter with no provider wired yet: in mock it lands in the outbox like email;
 * in live it is logged as failed ("no provider") until SMS_PROVIDER is implemented (see TODO-LIVE.md).
 */
export type NotifyInput =
  | ({ channel: "email" } & SendEmailInput)
  | { channel: "sms"; to: string; template: string; text: string; orderId?: string };

export async function notify(input: NotifyInput): Promise<{ ok: boolean }> {
  if (input.channel === "email") return sendEmail(input);
  const { error } = await serviceClient()
    .from("notifications_log")
    .insert({
      channel: "sms",
      template: input.template,
      to_address: input.to,
      subject: "",
      body_html: input.text,
      status: isMock ? "outbox" : "failed",
      error: isMock ? null : "No SMS provider configured",
      order_id: input.orderId ?? null,
    });
  return { ok: isMock && !error };
}

export type { ReactElement };
