"use client";

import { useActionState } from "react";
import { sendMagicLink, type MagicState } from "@/actions/admin/auth";

export function MagicLinkForm() {
  const [state, action, pending] = useActionState(sendMagicLink, { ok: false, message: "" } as MagicState);
  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <label className="field">Work email<input name="email" type="email" autoComplete="email" required /></label>
      <button className="btn btn-lime" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
