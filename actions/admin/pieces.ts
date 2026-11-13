"use server";

import { randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth/staff";
import { ERAS } from "@/lib/catalog/options";
import { measurementSchema, MEASUREMENT_FIELDS, type MeasurementKind } from "@/lib/catalog/measurements";
import { processAndStorePhoto, removeStoredPhoto } from "@/lib/images/process.server";
import { PIECES_TAG } from "@/lib/pieces/queries";
import { serverClient } from "@/lib/supabase/server";

export interface PieceFormState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
  slug?: string;
  title?: string;
  published?: boolean;
}

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const schema = z.object({
  title: z.string().trim().min(2, "Add a title").max(140),
  categoryId: z.string().uuid("Pick a type"),
  storeId: z.string().uuid("Pick a store"),
  sellerId: z.string().uuid().optional().or(z.literal("")),
  size: z.string().trim().min(1, "Pick a size").max(20),
  era: z.enum(ERAS),
  condition: z.enum(["like_new", "great", "light_wear", "worn_in"]),
  conditionNotes: z.string().trim().max(600).default(""),
  authenticityNotes: z.string().trim().max(600).default(""),
  description: z.string().trim().max(1200).default(""),
  price: z.string().trim(),
  priceTbd: z.string().optional(),
  intent: z.enum(["draft", "publish"]),
});

function parseCommon(form: FormData) {
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  let priceCents = 0, placeholder = false;
  if (parsed.success) {
    if (parsed.data.priceTbd === "on") { placeholder = true; priceCents = 5000; }
    else {
      const n = Number(parsed.data.price);
      if (!parsed.data.price || Number.isNaN(n) || n < 0 || n > 10000) errors.price = "Enter a price, or tick Price TBD";
      else priceCents = Math.round(n * 100);
    }
  }
  return { parsed, errors, raw, priceCents, placeholder };
}

function parseMeasurements(kind: MeasurementKind, raw: Record<string, string>) {
  const obj: Record<string, string | boolean> = {};
  for (const f of MEASUREMENT_FIELDS[kind]) {
    const v = raw[`m_${f.key}`];
    if (f.type === "boolean") { if (v === "on") obj[f.key] = true; }
    else if (v && v.trim()) obj[f.key] = v.trim();
  }
  return measurementSchema(kind).safeParse(obj);
}

async function categoryKind(sb: Awaited<ReturnType<typeof serverClient>>, id: string): Promise<MeasurementKind | null> {
  const { data } = await sb.from("categories").select("measurement_kind").eq("id", id).maybeSingle();
  return data?.measurement_kind ?? null;
}

async function savePhotos(sb: Awaited<ReturnType<typeof serverClient>>, pieceId: string, files: File[], startPosition: number) {
  const kinds = ["front", "back", "tag"] as const;
  let pos = startPosition;
  for (const f of files) {
    const p = await processAndStorePhoto(pieceId, f);
    const { error } = await sb.from("piece_photos").insert({ piece_id: pieceId, kind: kinds[pos] ?? "detail", path: p.path, source: "storage", width: p.width, height: p.height, blur_data_url: p.blur, position: pos });
    if (error) throw new Error(error.message);
    pos++;
  }
}

const realFiles = (form: FormData) => form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

/** Add a piece. Authorised twice: here, and by RLS (staff can only insert into their own store). */
export async function createPiece(_prev: PieceFormState, form: FormData): Promise<PieceFormState> {
  const staff = await assertStaff();
  const { parsed, errors, raw, priceCents, placeholder } = parseCommon(form);
  const files = realFiles(form);
  if (files.length === 0) errors.photos = "Add at least one photo";
  if (!parsed.success || Object.keys(errors).length) return { ok: false, message: "Check the highlighted fields.", errors };
  const v = parsed.data;
  if (staff.role === "staff" && v.storeId !== staff.storeId) return { ok: false, message: "You can only list pieces at your own store." };

  const sb = await serverClient();
  const kind = await categoryKind(sb, v.categoryId);
  if (!kind) return { ok: false, message: "Unknown type.", errors: { categoryId: "Pick a type" } };
  const m = parseMeasurements(kind, raw);
  if (!m.success) return { ok: false, message: "Check the measurements.", errors: { measurements: "Measurements look off" } };

  const slug = `${slugify(v.title)}-${randomBytes(2).toString("hex")}`;
  const { data: piece, error } = await sb.from("pieces").insert({
    slug, title: v.title, description: v.description, category_id: v.categoryId, store_id: v.storeId, seller_id: v.sellerId || null,
    size: v.size, era: v.era, condition: v.condition, condition_notes: v.conditionNotes, authenticity_notes: v.authenticityNotes,
    measurements: m.data as never, price_cents: priceCents, price_is_placeholder: placeholder,
  }).select("id, slug").single();
  if (error || !piece) return { ok: false, message: "Couldn't save that piece. Check you're allowed to list at that store." };

  try {
    await savePhotos(sb, piece.id, files, 0);
  } catch (e) {
    return { ok: false, message: `Saved as a draft, but a photo failed: ${e instanceof Error ? e.message : "upload error"}. Open it from Pieces to add photos.`, slug: piece.slug, title: v.title };
  }

  let published = false;
  if (v.intent === "publish") {
    const { error: pubErr } = await sb.rpc("set_piece_status", { p_piece: piece.id, p_to: "live", p_reason: "listed from admin" });
    if (pubErr) return { ok: false, message: `Saved as a draft. Couldn't publish: ${pubErr.message}`, slug: piece.slug, title: v.title };
    published = true;
  }
  revalidateTag(PIECES_TAG);
  return { ok: true, message: published ? "It's on the site." : "Saved as a draft.", slug: piece.slug, title: v.title, published };
}

export async function updatePiece(pieceId: string, _prev: PieceFormState, form: FormData): Promise<PieceFormState> {
  await assertStaff();
  const { parsed, errors, raw, priceCents, placeholder } = parseCommon(form);
  if (!parsed.success || Object.keys(errors).length) return { ok: false, message: "Check the highlighted fields.", errors };
  const v = parsed.data;
  const sb = await serverClient();
  const kind = await categoryKind(sb, v.categoryId);
  if (!kind) return { ok: false, message: "Unknown type." };
  const m = parseMeasurements(kind, raw);
  if (!m.success) return { ok: false, message: "Check the measurements." };

  const { data, error } = await sb.from("pieces").update({
    title: v.title, description: v.description, category_id: v.categoryId, store_id: v.storeId, seller_id: v.sellerId || null,
    size: v.size, era: v.era, condition: v.condition, condition_notes: v.conditionNotes, authenticity_notes: v.authenticityNotes,
    measurements: m.data as never, price_cents: priceCents, price_is_placeholder: placeholder,
  }).eq("id", pieceId).select("id, slug").maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "You can't edit that piece." };

  const files = realFiles(form);
  if (files.length) {
    const { count } = await sb.from("piece_photos").select("id", { count: "exact", head: true }).eq("piece_id", pieceId);
    try { await savePhotos(sb, pieceId, files, count ?? 0); } catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Photo upload failed" }; }
  }
  revalidateTag(PIECES_TAG);
  return { ok: true, message: "Saved.", slug: data.slug, title: v.title };
}

const id = z.string().uuid();

export async function setPieceStatus(pieceId: string, to: "draft" | "live" | "archived"): Promise<{ ok: boolean; message: string }> {
  await assertStaff();
  const sb = await serverClient();
  const { error } = await sb.rpc("set_piece_status", { p_piece: id.parse(pieceId), p_to: to });
  revalidateTag(PIECES_TAG);
  return error ? { ok: false, message: error.message } : { ok: true, message: to === "live" ? "Live on the site" : to === "archived" ? "Archived" : "Back to draft" };
}

export async function markSoldInStore(pieceId: string): Promise<{ ok: boolean; message: string }> {
  await assertStaff();
  const sb = await serverClient();
  const { data, error } = await sb.rpc("mark_sold_in_store", { p_piece: id.parse(pieceId) });
  revalidateTag(PIECES_TAG);
  const r = data as { ok?: boolean; code?: string } | null;
  if (error || !r?.ok) return { ok: false, message: error?.message ?? `Can't mark that sold (it's ${r?.code ?? "unavailable"}).` };
  return { ok: true, message: "Marked sold. Pulled from the site." };
}

export async function releaseHold(pieceId: string): Promise<{ ok: boolean; message: string }> {
  await assertStaff();
  const sb = await serverClient();
  const { error } = await sb.rpc("release_hold_admin", { p_piece: id.parse(pieceId) });
  revalidateTag(PIECES_TAG);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Back on the site" };
}

export async function deletePhoto(photoId: string): Promise<{ ok: boolean }> {
  await assertStaff();
  const sb = await serverClient();
  const { data } = await sb.from("piece_photos").select("path, source").eq("id", id.parse(photoId)).maybeSingle();
  if (!data) return { ok: false };
  const { error } = await sb.from("piece_photos").delete().eq("id", photoId);
  if (!error && data.source === "storage") await removeStoredPhoto(data.path);
  revalidateTag(PIECES_TAG);
  return { ok: !error };
}

export async function makeCover(photoId: string, pieceId: string): Promise<{ ok: boolean }> {
  await assertStaff();
  const sb = await serverClient();
  const { data: first } = await sb.from("piece_photos").select("position").eq("piece_id", id.parse(pieceId)).order("position").limit(1).maybeSingle();
  const { error } = await sb.from("piece_photos").update({ position: (first?.position ?? 0) - 1, kind: "front" }).eq("id", id.parse(photoId));
  revalidateTag(PIECES_TAG);
  return { ok: !error };
}
