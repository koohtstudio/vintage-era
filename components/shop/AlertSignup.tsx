"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "@/actions/subscribe";
import { CONSENT_TEXT } from "@/lib/consent";
import { Turnstile } from "./Turnstile";

const initial: SubscribeState = { ok: false, message: "" };

export function AlertSignup({ source = "home" }: { source?: string }) {
  const [state, action, pending] = useActionState(subscribe, initial);
  if (state.ok) {
    return (
      <p className="display" style={{ fontSize: 40, margin: 0 }} role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="af" noValidate>
      <input type="hidden" name="source" value={source} />
      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="inputs">
        <input type="text" name="contact" inputMode="email" autoComplete="email" placeholder="Email or phone" aria-label="Email or phone" required />
        <button className="btn btn-ink" type="submit" disabled={pending}>
          {pending ? "…" : "Alert me"}
        </button>
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>{CONSENT_TEXT}</span>
      </label>
      <Turnstile />
      {state.message ? (
        <p role="alert" style={{ margin: 0, fontWeight: 700 }}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
