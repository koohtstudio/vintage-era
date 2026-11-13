import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Order status URLs carry `<244-bit random token>.<hmac>`. The HMAC lets us reject any guessed or
 * tampered URL without touching the database; the random token is the actual capability.
 */
const mac = (token: string) =>
  createHmac("sha256", serverEnv().ORDER_TOKEN_SECRET).update(`order:${token}`).digest("base64url").slice(0, 22);

export const signOrderToken = (token: string) => `${token}.${mac(token)}`;

export function verifyOrderToken(value: string): string | null {
  const [token, sig] = value.split(".");
  if (!token || !sig || !/^[0-9a-f]{64}$/.test(token)) return null;
  const a = Buffer.from(mac(token));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b) ? token : null;
}

/** Hash an IP (or any identifier) so we can rate-limit and store consent without keeping raw IPs. */
export const hashId = (value: string) =>
  createHmac("sha256", serverEnv().SESSION_SECRET).update(`id:${value}`).digest("hex").slice(0, 32);
