"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ERAS, SIZE_FILTERS } from "@/lib/catalog/options";
import type { PieceCardData } from "@/lib/pieces/types";
import { PieceCard } from "./PieceCard";
import { useLivePieces } from "./useLivePieces";

type Key = "type" | "size" | "era" | "store" | "sort";
const SORTS = [
  { v: "new", label: "Newest" },
  { v: "low", label: "Price: low to high" },
  { v: "high", label: "Price: high to low" },
];

/**
 * The whole catalog is rendered statically; filtering happens here in memory.
 * Filters live in the URL (?type=jackets&size=L) so links are shareable and Back works.
 */
export function ShopBrowser({
  pieces,
  categories,
  stores,
  soldVisibleDays,
}: {
  pieces: PieceCardData[];
  categories: { slug: string; name: string }[];
  stores: { slug: string; name: string }[];
  soldVisibleDays: number;
}) {
  const params = useSearchParams();
  const live = useLivePieces(pieces, soldVisibleDays, { includeIncoming: true });
  const get = (k: Key) => params.get(k) ?? "";

  const setParam = useCallback(
    (k: Key, v: string) => {
      const next = new URLSearchParams(params.toString());
      if (v && v !== "all") next.set(k, v);
      else next.delete(k);
      const qs = next.toString();
      window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
    },
    [params],
  );

  const shown = useMemo(() => {
    const [t, s, e, st, so] = [get("type"), get("size"), get("era"), get("store"), get("sort") || "new"];
    const list = live.filter(
      ({ piece: p }) => (!t || p.categorySlug === t) && (!s || p.size === s) && (!e || p.era === e) && (!st || p.storeSlug === st),
    );
    if (so === "low") list.sort((a, b) => a.piece.priceCents - b.piece.priceCents);
    else if (so === "high") list.sort((a, b) => b.piece.priceCents - a.piece.priceCents);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, params]);

  const sizesPresent = SIZE_FILTERS.filter((s) => live.some((x) => x.piece.size === s));
  const erasPresent = ERAS.filter((e) => live.some((x) => x.piece.era === e));

  const Row = ({ label, k, options }: { label: string; k: Key; options: { v: string; label: string }[] }) => (
    <div className="frow" role="group" aria-label={label}>
      <b>{label}</b>
      <button className="chip" aria-pressed={!get(k)} onClick={() => setParam(k, "")}>
        All
      </button>
      {options.map((o) => (
        <button key={o.v} className="chip" aria-pressed={get(k) === o.v} onClick={() => setParam(k, o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="filters">
        <Row label="Type" k="type" options={categories.map((c) => ({ v: c.slug, label: c.name }))} />
        <Row label="Size" k="size" options={sizesPresent.map((s) => ({ v: s, label: s }))} />
        <Row label="Era" k="era" options={erasPresent.map((e) => ({ v: e, label: e }))} />
        <Row label="Store" k="store" options={stores.map((s) => ({ v: s.slug, label: s.name }))} />
        <div className="frow">
          <b>Sort</b>
          {SORTS.map((s) => (
            <button key={s.v} className="chip" aria-pressed={(get("sort") || "new") === s.v} onClick={() => setParam("sort", s.v === "new" ? "" : s.v)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mono" style={{ fontSize: 13, color: "var(--color-mute)", margin: "0 0 16px" }} aria-live="polite">
        {shown.length} piece{shown.length === 1 ? "" : "s"}
      </p>
      <div className="shop">
        {shown.map((x, i) => (
          <PieceCard key={x.piece.id} piece={x.piece} status={x.status} justDropped={x.justDropped} fresh={x.fresh} priority={i < 4} />
        ))}
      </div>
      {shown.length === 0 && (
        <p className="mono" style={{ textAlign: "center", padding: 40, color: "var(--color-mute)" }}>
          Nothing matches that right now. New pieces land every week.
        </p>
      )}
    </>
  );
}
