"use client";

import type { PieceCardData } from "@/lib/pieces/types";
import { PieceCard } from "./PieceCard";
import { useLivePieces } from "./useLivePieces";

/** Home grid: same live status as the shop, plus brand-new drops sliding in at the front. */
export function FreshFinds({ pieces, soldVisibleDays, limit = 8 }: { pieces: PieceCardData[]; soldVisibleDays: number; limit?: number }) {
  const live = useLivePieces(pieces, soldVisibleDays, { includeIncoming: true }).slice(0, limit);
  return (
    <div className="shop">
      {live.map((x, i) => (
        <PieceCard key={x.piece.id} piece={x.piece} status={x.status} justDropped={x.justDropped} fresh={x.fresh} priority={i < 2} />
      ))}
    </div>
  );
}
