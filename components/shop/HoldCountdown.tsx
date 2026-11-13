"use client";

/** "Held for you 14:32". Pure function of (expiresAt, now) so it can never drift from the server. */
export function HoldCountdown({ expiresAt, now }: { expiresAt: string; now: number }) {
  const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className={`hold ${left < 120 ? "low" : ""}`} role="timer" aria-label={`Held for you, ${mm} minutes ${ss} seconds left`}>
      Held for you {mm}:{ss}
    </span>
  );
}
