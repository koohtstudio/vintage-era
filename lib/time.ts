const TZ = "America/Toronto";

/** "2026-11-20T18:00" typed as Toronto wall-clock time -> the real UTC instant (handles DST). */
export function torontoLocalToUtc(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(asUtc));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  const date = new Date(asUtc - (shown - asUtc));
  return Number.isNaN(date.getTime()) ? null : date;
}

export const formatToronto = (iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, ...opts }).format(new Date(iso));
