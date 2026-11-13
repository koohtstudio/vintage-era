"use client";

import { useBag } from "./BagProvider";

export function BagButton() {
  const { count, setOpen } = useBag();
  return (
    <button className="btn btn-ink bagbtn" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} piece${count === 1 ? "" : "s"}`}>
      Bag <span className="count">{count}</span>
    </button>
  );
}
