"use client";

import { useActionState, type ReactNode } from "react";
import type { OwnerState } from "@/actions/admin/owner";

/** Small wrapper: a <form> bound to an owner server action with an inline result line. */
export function OwnerForm({ action, children, submit = "Save", className = "aform" }: { action: (p: OwnerState, f: FormData) => Promise<OwnerState>; children: ReactNode; submit?: string; className?: string }) {
  const [state, act, pending] = useActionState(action, { ok: false, message: "" });
  return (
    <form action={act} className={className}>
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-lime" disabled={pending}>{pending ? "Saving…" : submit}</button>
        {state.message && <span role="status" className="mono" style={{ fontSize: 13, fontWeight: 700, color: state.ok ? "#2E7D17" : "var(--color-hot)" }}>{state.message}</span>}
      </div>
    </form>
  );
}
