import "server-only";
import { headers } from "next/headers";
import { serviceClient } from "@/lib/supabase/admin";
import { hashId } from "@/lib/security/tokens";

export interface RateResult {
  ok: boolean;
  retryAfter: number;
}

/** Fixed-window limiter backed by Postgres (check_rate_limit). Same behaviour in mock and live. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateResult> {
  const { data, error } = await serviceClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || !data) return { ok: false, retryAfter: 30 }; // fail closed
  const r = data as { ok: boolean; retry_after: number };
  return { ok: r.ok, retryAfter: r.retry_after };
}

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return hashId(ip);
}
