import { z } from "zod";

/**
 * ONE source of truth for "which measurements does this kind of piece have".
 * Drives: the admin form fields, the zod validation, the card hover text and the piece page table.
 */
export type MeasurementKind = "tops" | "bottoms" | "collectible" | "game";

export type FieldDef =
  | { key: string; label: string; type: "number"; unit: string; hint?: string }
  | { key: string; label: string; type: "text"; hint?: string }
  | { key: string; label: string; type: "boolean" };

export const MEASUREMENT_FIELDS: Record<MeasurementKind, FieldDef[]> = {
  tops: [
    { key: "pit_to_pit", label: "Pit to pit", type: "number", unit: "in", hint: "Flat, armpit to armpit" },
    { key: "length", label: "Length", type: "number", unit: "in", hint: "Collar seam to hem" },
    { key: "sleeve", label: "Sleeve", type: "number", unit: "in" },
    { key: "shoulder", label: "Shoulder", type: "number", unit: "in" },
  ],
  bottoms: [
    { key: "waist", label: "Waist", type: "number", unit: "in", hint: "Flat, side to side x2" },
    { key: "inseam", label: "Inseam", type: "number", unit: "in" },
    { key: "rise", label: "Rise", type: "number", unit: "in" },
    { key: "leg_opening", label: "Leg opening", type: "number", unit: "in" },
  ],
  collectible: [
    { key: "dimensions", label: "Dimensions", type: "text", hint: "e.g. 12 in tall" },
    { key: "count", label: "Pieces in lot", type: "number", unit: "" },
  ],
  game: [
    { key: "platform", label: "Platform", type: "text", hint: "e.g. SNES" },
    { key: "region", label: "Region", type: "text", hint: "NTSC / PAL" },
    { key: "tested", label: "Tested and working", type: "boolean" },
    { key: "complete", label: "Complete in box", type: "boolean" },
  ],
};

export function measurementSchema(kind: MeasurementKind) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of MEASUREMENT_FIELDS[kind]) {
    if (f.type === "number") shape[f.key] = z.coerce.number().min(0).max(200).optional();
    else if (f.type === "boolean") shape[f.key] = z.coerce.boolean().optional();
    else shape[f.key] = z.string().trim().max(80).optional();
  }
  return z.object(shape).strip();
}

/** "Pit to pit 23 in · Length 28 in" for hover text and the piece page. */
export function measurementSummary(kind: MeasurementKind, m: Record<string, unknown>, only = 3): string[] {
  const out: string[] = [];
  for (const f of MEASUREMENT_FIELDS[kind]) {
    const v = m[f.key];
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (f.type === "number") out.push(`${f.label} ${v}${f.unit ? ` ${f.unit}` : ""}`);
    else if (f.type === "boolean") out.push(f.label);
    else out.push(`${f.label} ${v}`);
  }
  return out.slice(0, only);
}
