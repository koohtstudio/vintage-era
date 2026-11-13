import "server-only";
import { isMock } from "@/lib/mode";
import { serverEnv } from "@/lib/env";

/** Cloudflare Turnstile adapter. Mock mode accepts everything (the widget is not rendered). */
export async function verifyCaptcha(token: string | null | undefined, remoteIp?: string): Promise<boolean> {
  if (isMock) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: serverEnv().TURNSTILE_SECRET_KEY ?? "", response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
