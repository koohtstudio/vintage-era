"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { loadBag, type BagLine } from "@/lib/bag";
import { PIECES_TAG } from "@/lib/pieces/queries";
import { clientIpHash, rateLimit } from "@/lib/ratelimit";
import { ensureShopperSession, getShopperSession } from "@/lib/security/session";
import { serviceClient } from "@/lib/supabase/admin";
import { isLive } from "@/lib/mode";

export type BagResult =
  | { ok: true; lines: BagLine[]; code: "held" | "already" }
  | { ok: false; code: "held" | "sold" | "unavailable" | "cap" | "rate" | "invalid"; message: string };

const idSchema = z.string().uuid();
const HAS_BAG = "ev_has_bag";

const MESSAGES = {
  held: "Someone just added that one to their bag.",
  sold: "That one just sold.",
  unavailable: "That piece isn't available right now.",
  cap: "That's the max you can hold at once. Check out or remove one.",
  rate: "Easy there. Try again in a moment.",
  invalid: "Something went wrong. Try again.",
} as const;

/** Add to bag = start a 15-minute hold, atomically, in the database. */
export async function addToBag(pieceId: string): Promise<BagResult> {
  const parsed = idSchema.safeParse(pieceId);
  if (!parsed.success) return { ok: false, code: "invalid", message: MESSAGES.invalid };

  const sid = await ensureShopperSession();
  const [bySession, byIp] = await Promise.all([
    rateLimit(`hold:s:${sid}`, 20, 300),
    rateLimit(`hold:ip:${await clientIpHash()}`, 40, 300),
  ]);
  if (!bySession.ok || !byIp.ok) return { ok: false, code: "rate", message: MESSAGES.rate };

  const { data, error } = await serviceClient().rpc("create_hold", { p_piece: parsed.data, p_session: sid });
  if (error) return { ok: false, code: "invalid", message: MESSAGES.invalid };
  const res = data as unknown as { ok: boolean; code: keyof typeof MESSAGES | "already"; cap?: number };
  revalidateTag(PIECES_TAG);

  if (!res.ok) {
    const code = res.code === "already" ? "held" : res.code;
    return { ok: false, code: code as "held", message: MESSAGES[code as keyof typeof MESSAGES] ?? MESSAGES.invalid };
  }
  (await cookies()).set(HAS_BAG, "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: isLive });
  return { ok: true, code: res.code as "held" | "already", lines: await loadBag(sid) };
}

export async function removeFromBag(pieceId: string): Promise<{ ok: boolean; lines: BagLine[] }> {
  const parsed = idSchema.safeParse(pieceId);
  const sid = await getShopperSession();
  if (!parsed.success || !sid) return { ok: false, lines: [] };
  await serviceClient().rpc("release_hold", { p_piece: parsed.data, p_session: sid });
  revalidateTag(PIECES_TAG);
  return { ok: true, lines: await loadBag(sid) };
}
