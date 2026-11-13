"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isMock } from "@/lib/mode";
import { clientIpHash, rateLimit } from "@/lib/ratelimit";
import { serverClient } from "@/lib/supabase/server";

const DEMO = {
  owner: "owner@era-vintage.test",
  barrie: "barrie@era-vintage.test",
  toronto: "toronto@era-vintage.test",
} as const;

/** MOCK ONLY. Signs in one of the seeded demo accounts. In live mode this action refuses to run. */
export async function demoLogin(who: keyof typeof DEMO) {
  if (!isMock) throw new Error("Demo login is disabled in live mode");
  if (!(who in DEMO)) throw new Error("Unknown demo account");
  const sb = await serverClient();
  const { error } = await sb.auth.signInWithPassword({ email: DEMO[who], password: "demo-password" });
  if (error) throw new Error("Demo accounts missing. Run: pnpm db:reset");
  redirect("/admin");
}

export interface MagicState { ok: boolean; message: string }

/** LIVE: passwordless email link. Only existing profiles can sign in (shouldCreateUser: false). */
export async function sendMagicLink(_p: MagicState, form: FormData): Promise<MagicState> {
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) return { ok: false, message: "Enter your work email." };
  if (!(await rateLimit(`magic:${await clientIpHash()}`, 5, 900)).ok) return { ok: false, message: "Too many tries. Wait a few minutes." };
  const sb = await serverClient();
  await sb.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: false, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` } });
  return { ok: true, message: "If that email has access, a sign-in link is on its way." }; // same answer either way
}

export async function signOut() {
  const sb = await serverClient();
  await sb.auth.signOut();
  redirect("/admin/login");
}
