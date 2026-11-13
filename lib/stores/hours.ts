const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

const t = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}` : `${h12}`;
};

/** {mon:["09:30","21:00"],…} -> ["Mon to Fri 9:30 to 9", "Sat 9:30 to 6", "Sun 11 to 5"]. Empty -> null ("[hours]"). */
export function formatHours(hours: unknown): string[] | null {
  const h = (hours ?? {}) as Record<string, [string, string] | null>;
  if (!DAYS.some((d) => h[d])) return null;
  const groups: { from: string; to: string; span: string }[] = [];
  for (const d of DAYS) {
    const v = h[d];
    const span = v ? `${t(v[0])} to ${t(v[1])}` : "Closed";
    const last = groups[groups.length - 1];
    if (last && last.span === span) last.to = d;
    else groups.push({ from: d, to: d, span });
  }
  return groups.map((g) => `${g.from === g.to ? LABEL[g.from] : `${LABEL[g.from]} to ${LABEL[g.to]}`} ${g.span}`);
}

/** Is the store open right now (Toronto time)? null when hours are unknown. */
export function isOpenNow(hours: unknown, at = new Date()): boolean | null {
  const h = (hours ?? {}) as Record<string, [string, string] | null>;
  if (!DAYS.some((d) => h[d])) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(at);
  const wd = (parts.find((p) => p.type === "weekday")?.value ?? "Mon").slice(0, 3).toLowerCase();
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const v = h[wd];
  if (!v) return false;
  const now = `${hh === "24" ? "00" : hh}:${mm}`;
  return now >= v[0] && now < v[1];
}
