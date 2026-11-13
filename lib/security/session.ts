import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import { isLive } from "@/lib/mode";

/**
 * Shopper identity = a signed, httpOnly cookie: `<uuid>.<hmac>`.
 * The uuid is the holds.session_id. Because it's signed with a server-only secret, a visitor can't
 * invent or guess another shopper's id, and the database functions that take a session id are
 * callable only by the server (service_role), never by the browser.
 */
export const SESSION_COOKIE = "ev_sid";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

const sign = (id: string) => createHmac("sha256", serverEnv().SESSION_SECRET).update(`sid:${id}`).digest("base64url");

export function verifySessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

/** Read-only: the current shopper's session id, or null if they have none yet. */
export async function getShopperSession(): Promise<string | null> {
  return verifySessionValue((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Mint the cookie if missing. Server Actions and Route Handlers only (they can set cookies). */
export async function ensureShopperSession(): Promise<string> {
  const store = await cookies();
  const existing = verifySessionValue(store.get(SESSION_COOKIE)?.value);
  if (existing) return existing;
  const id = randomUUID();
  store.set(SESSION_COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isLive,
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return id;
}
