"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { measurementSummary } from "@/lib/catalog/measurements";
import { conditionLabel } from "@/lib/catalog/options";
import { displayPrice } from "@/lib/money";
import type { ShopStatus } from "@/lib/pieces/status";
import type { PieceCardData } from "@/lib/pieces/types";
import { useBag } from "./BagProvider";

interface Props {
  piece: PieceCardData;
  status: ShopStatus;
  justDropped: boolean;
  /** a live event just changed this card: pulse it */
  fresh: boolean;
  priority?: boolean;
}

export const PieceCard = memo(function PieceCard({ piece: p, status, justDropped, fresh, priority }: Props) {
  const { add, inBag, busy, setOpen } = useBag();
  const mine = inBag(p.id);
  const sold = status === "sold";
  const heldByOther = status === "held" && !mine;
  const meas = measurementSummary(p.kind, p.measurements, 3);

  const label = sold ? "Gone" : mine ? "In bag" : heldByOther ? "In a bag" : busy === p.id ? "…" : "Add";
  const onClick = () => (mine ? setOpen(true) : void add(p.id));

  return (
    <article className={`card ${fresh ? "flash-in" : ""}`} data-status={status}>
      <div className="ph">
        {p.cover ? (
          <Image
            src={p.cover.url}
            alt={p.title}
            fill
            sizes="(min-width: 820px) 25vw, 50vw"
            priority={priority}
            placeholder={p.cover.blur ? "blur" : "empty"}
            blurDataURL={p.cover.blur ?? undefined}
          />
        ) : null}
        <span className="era">{p.era}</span>
        <span className="one" aria-hidden="true">1/1</span>
        {!sold && (justDropped || mine || heldByOther) && (
          <span className={`badge ${mine ? "mine" : heldByOther ? "bag" : "new"}`} role="status">
            {mine ? "In your bag" : heldByOther ? "In a bag" : "Just dropped"}
          </span>
        )}
        {meas.length > 0 && !sold && <div className="meas">{meas.join(" · ")} · flat</div>}
        {sold && (
          <div className="sold-stamp" role="status">
            <span>Sold</span>
          </div>
        )}
      </div>
      <div className="body">
        <h3>
          <Link href={`/piece/${p.slug}`}>{p.title}</Link>
        </h3>
        <span className="meta">
          Size {p.size} · {conditionLabel(p.condition)}
        </span>
        <span className="meta">At {p.storeName}</span>
        <div className="row">
          <span className={`price ${p.pricePlaceholder ? "ph2" : ""}`}>{displayPrice(p.priceCents, p.pricePlaceholder)}</span>
          <button className={`add ${mine ? "in" : ""}`} onClick={onClick} disabled={sold || heldByOther || busy === p.id} aria-label={`${label}: ${p.title}`}>
            {label}
          </button>
        </div>
      </div>
    </article>
  );
});
