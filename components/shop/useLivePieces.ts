"use client";

import { useEffect, useMemo } from "react";
import { effectiveStatus, isJustDropped, isVisibleNow, type ShopStatus } from "@/lib/pieces/status";
import type { PieceCardData } from "@/lib/pieces/types";
import { useLive } from "./LiveProvider";

export interface LivePiece {
  piece: PieceCardData;
  status: ShopStatus;
  justDropped: boolean;
  fresh: boolean;
}

/** Server data + realtime overrides + new arrivals, resolved against the clock. */
export function useLivePieces(pieces: PieceCardData[], soldVisibleDays: number, opts: { includeIncoming: boolean }): LivePiece[] {
  const { now, overrides, hidden, incoming, register } = useLive();

  useEffect(() => {
    register(pieces.map((p) => p.id));
  }, [pieces, register]);

  return useMemo(() => {
    const ids = new Set(pieces.map((p) => p.id));
    const extra = opts.includeIncoming ? incoming.filter((p) => !ids.has(p.id)) : [];
    return [...extra, ...pieces]
      .filter((p) => !hidden.has(p.id))
      .map((base) => {
        const o = overrides[base.id];
        const piece = o ? { ...base, status: o.status, heldUntil: o.heldUntil, soldAt: o.soldAt, justDroppedUntil: o.justDroppedUntil } : base;
        return {
          piece,
          status: effectiveStatus(piece, now),
          justDropped: isJustDropped(piece, now) || (!ids.has(base.id) && !o),
          fresh: !!o && now - o.at < 6000,
        };
      })
      .filter((x) => isVisibleNow(x.piece, soldVisibleDays, now) && (x.piece.status === "live" || x.piece.status === "held" || x.piece.status === "sold"));
  }, [pieces, incoming, overrides, hidden, now, soldVisibleDays, opts.includeIncoming]);
}
