"use client";

import { useBag } from "./BagProvider";

export function BagToast() {
  const { toast } = useBag();
  return (
    <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
      {toast || " "}
    </div>
  );
}
