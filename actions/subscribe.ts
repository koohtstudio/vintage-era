"use server";

import { createElement } from "react";
import { headers } from "next/headers";
import { z } from "zod";
import Welcome from "@/emails/Welcome";
import { verifyCaptcha } from "@/lib/captcha";
import { CONSENT_TEXT } from "@/lib/consent";
import { notify } from "@/lib/notify";
import { siteUrl } from "@/lib/orders/queries";
import { clientIpHash, rateLimit } from "@/lib/ratelimit";
import { serviceClient } from "@/lib/supabase/admin";

export interface SubscribeState {
  ok: boolean;
  message: string;
}

const schema = z.object({
  contact: z.string().trim().min(5, "Enter an email or phone number").max(120),
  consent: z.literal("on", { error: "Tick the box so we know it's OK to message you" }),
  company: z.string().max(0), // honeypot: bots fill it, people never see it
  source: z.string().max(30).default("site"),
});

const emailSchema = z.string().email();

/** Email or phone -> {email} | {phone} (+1 for 10-digit North American numbers). */
function parseContact(raw: string): { email: string | null; phone: string | null } | null {
  if (raw.includes("@")) {
    const e = emailSchema.safeParse(raw.toLowerCase());
    return e.success ? { email: e.data, phone: null } : null;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return { email: null, phone: `+1${digits}` };
  if (digits.length === 11 && digits.startsWith("1")) return { email: null, phone: `+${digits}` };
  return null;
}

/** CASL: explicit opt-in checkbox, exact wording + time + hashed IP stored, unsubscribe link in every message. */
export async function subscribe(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  const parsed = schema.safeParse({
    contact: form.get("contact"),
    consent: form.get("consent"),
    company: form.get("company") ?? "",
    source: form.get("source") ?? "site",
  });
  if (!parsed.success) {
    if (form.get("company")) return { ok: true, message: "You're on the list." }; // pretend success to bots
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const contact = parseContact(parsed.data.contact);
  if (!contact) return { ok: false, message: "That doesn't look like an email or a Canadian phone number." };

  const ipHash = await clientIpHash();
  if (!(await rateLimit(`sub:${ipHash}`, 5, 3600)).ok) return { ok: false, message: "Too many tries. Please wait a bit." };
  if (!(await verifyCaptcha(form.get("cf-turnstile-response") as string | null))) return { ok: false, message: "Couldn't verify you're human. Try again." };

  const h = await headers();
  const { data, error } = await serviceClient().rpc("subscribe_alerts", {
    p_email: contact.email as string,
    p_phone: contact.phone as string,
    p_consent_text: CONSENT_TEXT,
    p_ip_hash: ipHash,
    p_user_agent: (h.get("user-agent") ?? "").slice(0, 200),
    p_source: parsed.data.source,
  });
  const res = data as unknown as { ok: boolean; unsubscribe_token?: string };
  if (error || !res?.ok || !res.unsubscribe_token) return { ok: false, message: "Something went wrong. Try again." };

  const unsubscribeUrl = `${siteUrl()}/unsubscribe/${res.unsubscribe_token}`;
  if (contact.email) {
    await notify({
      channel: "email",
      to: contact.email,
      template: "welcome",
      subject: "You're on the Era Vintage drop list",
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      element: createElement(Welcome, { shopUrl: `${siteUrl()}/shop`, unsubscribeUrl }),
    });
  } else if (contact.phone) {
    await notify({ channel: "sms", to: contact.phone, template: "welcome_sms", text: `Era Vintage: you're on the drop list. Reply STOP or visit ${unsubscribeUrl} to unsubscribe.` });
  }
  return { ok: true, message: "You're on the list." };
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  const { data } = await serviceClient().rpc("unsubscribe_by_token", { p_token: token });
  return data === true;
}
