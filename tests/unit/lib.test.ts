import { describe, expect, it } from "vitest";
import { measurementSchema, measurementSummary } from "@/lib/catalog/measurements";
import { displayPrice, displayTotal, formatMoney } from "@/lib/money";
import { effectiveStatus, isVisibleNow } from "@/lib/pieces/status";
import { formatHours, isOpenNow } from "@/lib/stores/hours";
import { torontoLocalToUtc } from "@/lib/time";

describe("money", () => {
  it("formats cents and hides placeholder prices", () => {
    expect(formatMoney(14500)).toBe("$145.00");
    expect(displayPrice(14500, false)).toBe("$145");
    expect(displayPrice(14550, false)).toBe("$145.50");
    expect(displayPrice(14500, true)).toBe("[price]");
    expect(displayTotal(100, true)).toBe("[price total]");
  });
});

describe("effectiveStatus (lazy hold expiry)", () => {
  const now = Date.parse("2026-11-13T12:00:00Z");
  it("shows held until held_until passes, then live again", () => {
    expect(effectiveStatus({ status: "held", heldUntil: "2026-11-13T12:10:00Z" }, now)).toBe("held");
    expect(effectiveStatus({ status: "held", heldUntil: "2026-11-13T11:59:00Z" }, now)).toBe("live");
    expect(effectiveStatus({ status: "held", heldUntil: null }, now)).toBe("live");
    expect(effectiveStatus({ status: "sold", heldUntil: null }, now)).toBe("sold");
  });
  it("hides sold pieces after the visibility window", () => {
    expect(isVisibleNow({ status: "sold", soldAt: "2026-11-12T12:00:00Z" }, 3, now)).toBe(true);
    expect(isVisibleNow({ status: "sold", soldAt: "2026-11-01T12:00:00Z" }, 3, now)).toBe(false);
    expect(isVisibleNow({ status: "draft", soldAt: null }, 3, now)).toBe(false);
  });
});

describe("measurements", () => {
  it("validates per kind and strips unknown keys", () => {
    const ok = measurementSchema("tops").safeParse({ pit_to_pit: "23", length: "28", evil: "x" });
    expect(ok.success && ok.data).toEqual({ pit_to_pit: 23, length: 28 });
    expect(measurementSchema("tops").safeParse({ pit_to_pit: "-1" }).success).toBe(false);
  });
  it("summarises for card hover text", () => {
    expect(measurementSummary("tops", { pit_to_pit: 23, length: 28 })).toEqual(["Pit to pit 23 in", "Length 28 in"]);
  });
});

describe("store hours", () => {
  const hours = { mon: ["09:30", "21:00"], tue: ["09:30", "21:00"], sat: ["09:30", "18:00"] };
  it("groups days and reports unknown hours as null", () => {
    expect(formatHours(hours)).toEqual(["Mon to Tue 9:30 to 9", "Wed to Fri Closed", "Sat 9:30 to 6", "Sun Closed"]);
    expect(formatHours({})).toBeNull();
    expect(isOpenNow({})).toBeNull();
  });
  it("knows when a store is open in Toronto time", () => {
    expect(isOpenNow(hours, new Date("2026-11-16T15:00:00Z"))).toBe(true); // Mon 10:00 ET
    expect(isOpenNow(hours, new Date("2026-11-16T03:00:00Z"))).toBe(false); // Sun night ET
  });
});

describe("Toronto time", () => {
  it("converts wall-clock time to UTC across DST", () => {
    expect(torontoLocalToUtc("2026-11-20T18:00")?.toISOString()).toBe("2026-11-20T23:00:00.000Z"); // EST
    expect(torontoLocalToUtc("2026-07-17T18:00")?.toISOString()).toBe("2026-07-17T22:00:00.000Z"); // EDT
    expect(torontoLocalToUtc("garbage")).toBeNull();
  });
});
