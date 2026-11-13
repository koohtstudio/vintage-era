"use client";

import { useEffect } from "react";
import { displayPrice } from "@/lib/money";
import { effectiveStatus } from "@/lib/pieces/status";
import type { PieceDetail } from "@/lib/pieces/types";
import { useBag } from "./BagProvider";
import { HoldCountdown } from "./HoldCountdown";
import { useLive } from "./LiveProvider";

/** Price, live status and the Add to bag button for one piece. Flips live when someone else bags or buys it. */
export function PieceActions({ piece }: { piece: PieceDetail }) {
  const { now, overrides, register } = useLive();
  const { add, inBag, busy, lines, now: bagNow, setOpen } = useBag();
  useEffect(() => register([piece.id]), [piece.id, register]);

  const o = overrides[piece.id];
  const live = o ? { status: o.status, heldUntil: o.heldUntil } : { status: piece.status, heldUntil: piece.heldUntil };
  const status = effectiveStatus(live, now);
  const mine = inBag(piece.id);
  const line = lines.find((l) => l.pieceId === piece.id);

  return (
    <div>
      <p className="price" style={{ fontSize: 34, margin: "6px 0 14px" }}>{displayPrice(piece.priceCents, piece.pricePlaceholder)}</p>
      {status === "sold" ? (
        <>
          <button className="btn btn-ink" disabled style={{ width: "100%" }}>Sold. Gone for good.</button>
          <p className="mono" style={{ fontSize: 12, color: "var(--color-mute)" }}>Every piece is one of one.</p>
        </>
      ) : mine ? (
        <>
          <button className="btn btn-lime" style={{ width: "100%" }} onClick={() => setOpen(true)}>In your bag. Check out</button>
          {line && <p style={{ margin: "12px 0 0" }}><HoldCountdown expiresAt={line.expiresAt} now={bagNow} /></p>}
        </>
      ) : status === "held" ? (
        <>
          <button className="btn btn-pink" disabled style={{ width: "100%" }}>In someone&apos;s bag</button>
          <p className="mono" style={{ fontSize: 12, color: "var(--color-mute)" }} role="status">Held for a few minutes. If they don&apos;t check out, it comes back here.</p>
        </>
      ) : (
        <button className="btn btn-lime" style={{ width: "100%" }} disabled={busy === piece.id} onClick={() => void add(piece.id)}>
          {busy === piece.id ? "Holding…" : "Add to bag"}
        </button>
      )}
    </div>
  );
}
