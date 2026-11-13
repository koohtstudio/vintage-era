"use client";

import { useEffect, useState } from "react";

/** Ticks down to a scheduled drop. At zero it says so; the pieces themselves arrive over realtime. */
export function DropCountdown({ startsAt, initialNow }: { startsAt: string; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(startsAt).getTime() - now);
  if (ms === 0) {
    return (
      <p className="display" style={{ fontSize: 40, margin: 0 }} role="status">
        Dropping now…
      </p>
    );
  }
  const s = Math.floor(ms / 1000);
  const cells = [
    ["days", Math.floor(s / 86400)],
    ["hrs", Math.floor((s % 86400) / 3600)],
    ["min", Math.floor((s % 3600) / 60)],
    ["sec", s % 60],
  ] as const;
  return (
    <div className="countdown" role="timer" aria-label={`Drop starts in ${cells[0][1]} days ${cells[1][1]} hours ${cells[2][1]} minutes`}>
      {cells.map(([label, v]) => (
        <div className="cell" key={label}>
          {String(v).padStart(2, "0")}
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
