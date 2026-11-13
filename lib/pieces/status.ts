import type { PieceStatus } from "./types";

export type ShopStatus = "live" | "held" | "sold";

/**
 * What a shopper should SEE right now. A `held` row whose held_until has passed is shown as
 * live immediately (lazy expiry) without waiting for the 30-second cron sweep to flip the row.
 */
export function effectiveStatus(p: { status: PieceStatus; heldUntil: string | null }, now: number): ShopStatus {
  if (p.status === "sold") return "sold";
  if (p.status === "held" && p.heldUntil && new Date(p.heldUntil).getTime() > now) return "held";
  return "live";
}

export const isJustDropped = (p: { justDroppedUntil: string | null }, now: number) =>
  !!p.justDroppedUntil && new Date(p.justDroppedUntil).getTime() > now;

/** Sold pieces stay visible (as "Sold") for `days`, then disappear. */
export function isVisibleNow(p: { status: PieceStatus; soldAt: string | null }, days: number, now: number): boolean {
  if (p.status !== "sold") return p.status === "live" || p.status === "held";
  return !!p.soldAt && new Date(p.soldAt).getTime() > now - days * 86_400_000;
}
