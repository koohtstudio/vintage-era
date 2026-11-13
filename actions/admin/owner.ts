"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { assertOwner } from "@/lib/auth/staff";
import { sendDropAlert } from "@/lib/drops/alerts";
import { PIECES_TAG, SETTINGS_TAG } from "@/lib/pieces/queries";
import { serviceClient } from "@/lib/supabase/admin";
import { serverClient } from "@/lib/supabase/server";
import { torontoLocalToUtc } from "@/lib/time";

export interface OwnerState { ok: boolean; message: string }
const done = (message: string): OwnerState => ({ ok: true, message });
const fail = (message: string): OwnerState => ({ ok: false, message });
const uuid = z.string().uuid();

// ---------------- drops ----------------
export async function createDrop(_p: OwnerState, form: FormData): Promise<OwnerState> {
  await assertOwner();
  const v = z.object({ name: z.string().trim().min(2).max(80), startsAt: z.string(), alert: z.string().optional() }).safeParse(Object.fromEntries(form));
  const pieceIds = form.getAll("pieceIds").map(String).filter((x) => uuid.safeParse(x).success);
  if (!v.success) return fail("Add a name and a date and time.");
  const when = torontoLocalToUtc(v.data.startsAt);
  if (!when) return fail("That date and time isn't valid.");
  if (when.getTime() < Date.now() - 60_000) return fail("Pick a time in the future.");
  if (pieceIds.length === 0) return fail("Pick at least one draft piece.");
  const sb = await serverClient();
  const { data: drop, error } = await sb.from("drops").insert({ name: v.data.name, starts_at: when.toISOString(), alert_on_release: v.data.alert === "on" }).select("id").single();
  if (error || !drop) return fail(error?.message ?? "Couldn't create the drop.");
  const { error: e2 } = await sb.from("drop_pieces").insert(pieceIds.map((piece_id) => ({ drop_id: drop.id, piece_id })));
  if (e2) { await sb.from("drops").delete().eq("id", drop.id); return fail(e2.message); }
  revalidateTag(PIECES_TAG); revalidatePath("/admin/drops");
  return done("Drop scheduled.");
}

export async function cancelDrop(dropId: string): Promise<void> {
  await assertOwner();
  const sb = await serverClient();
  await sb.from("drops").update({ status: "cancelled" }).eq("id", uuid.parse(dropId)).eq("status", "scheduled");
  revalidateTag(PIECES_TAG); revalidatePath("/admin/drops");
}

/** Demo and real use: open a scheduled drop right now (same code path as the timer). */
export async function openDropNow(dropId: string): Promise<void> {
  await assertOwner();
  const sb = await serverClient();
  await sb.from("drops").update({ starts_at: new Date().toISOString() }).eq("id", uuid.parse(dropId)).eq("status", "scheduled");
  await serviceClient().rpc("release_due_drops");
  revalidateTag(PIECES_TAG); revalidatePath("/admin/drops");
}

export async function sendDropAlertNow(dropId: string): Promise<void> {
  await assertOwner();
  await sendDropAlert(uuid.parse(dropId));
  revalidatePath("/admin/drops");
}

// ---------------- homepage ----------------
export async function saveHomepage(_p: OwnerState, form: FormData): Promise<OwnerState> {
  await assertOwner();
  const ticker = String(form.get("ticker") ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (ticker.some((t) => t.length > 80)) return fail("Keep each message under 80 characters.");
  const featured = form.getAll("featured").map(String).filter((x) => uuid.safeParse(x).success).slice(0, 8);
  const sb = await serverClient();
  const { error } = await sb.from("settings").update({ ticker_messages: ticker }).eq("id", true);
  if (error) return fail(error.message);
  await sb.from("pieces").update({ featured_rank: null }).not("featured_rank", "is", null);
  for (const [i, id] of featured.entries()) await sb.from("pieces").update({ featured_rank: i + 1 }).eq("id", id);
  revalidateTag(PIECES_TAG); revalidateTag(SETTINGS_TAG);
  return done("Homepage updated.");
}

export async function addReview(_p: OwnerState, form: FormData): Promise<OwnerState> {
  await assertOwner();
  const v = z.object({ quote: z.string().trim().min(3).max(500), author: z.string().trim().max(60).default("") }).safeParse(Object.fromEntries(form));
  if (!v.success) return fail("Paste the review text.");
  const sb = await serverClient();
  const { error } = await sb.from("reviews").insert({ quote: v.data.quote, author: v.data.author, confirmed: true, source: "Google" });
  revalidateTag(SETTINGS_TAG); revalidatePath("/admin/homepage");
  return error ? fail(error.message) : done("Review added.");
}

export async function toggleReview(id: string, confirmed: boolean): Promise<void> {
  await assertOwner();
  await (await serverClient()).from("reviews").update({ confirmed }).eq("id", uuid.parse(id));
  revalidateTag(SETTINGS_TAG); revalidatePath("/admin/homepage");
}
export async function deleteReview(id: string): Promise<void> {
  await assertOwner();
  await (await serverClient()).from("reviews").delete().eq("id", uuid.parse(id));
  revalidateTag(SETTINGS_TAG); revalidatePath("/admin/homepage");
}

// ---------------- sellers ----------------
export async function saveSeller(_p: OwnerState, form: FormData): Promise<OwnerState> {
  await assertOwner();
  const v = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(80), instagram: z.string().trim().max(60).default("") }).safeParse(Object.fromEntries(form));
  if (!v.success) return fail("Add a name.");
  const sb = await serverClient();
  const handle = v.data.instagram.replace(/^@/, "");
  const { error } = v.data.id ? await sb.from("sellers").update({ name: v.data.name, instagram: handle, is_placeholder: false }).eq("id", uuid.parse(v.data.id))
    : await sb.from("sellers").insert({ name: v.data.name, instagram: handle, sort: 99 });
  revalidateTag(SETTINGS_TAG); revalidatePath("/admin/sellers");
  return error ? fail(error.message) : done("Saved.");
}
export async function toggleSeller(id: string, active: boolean): Promise<void> {
  await assertOwner();
  await (await serverClient()).from("sellers").update({ active }).eq("id", uuid.parse(id));
  revalidateTag(SETTINGS_TAG); revalidatePath("/admin/sellers");
}

// ---------------- settings ----------------
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export async function saveSettings(_p: OwnerState, form: FormData): Promise<OwnerState> {
  await assertOwner();
  const v = z.object({
    hold_minutes: z.coerce.number().int().min(1).max(120),
    max_holds: z.coerce.number().int().min(1).max(50),
    shipping: z.coerce.number().min(0).max(500),
    tax: z.coerce.number().min(0).max(50),
    sold_days: z.coerce.number().int().min(0).max(30),
    rating: z.string().optional(), reviews: z.string().optional(),
  }).safeParse(Object.fromEntries(form));
  if (!v.success) return fail("Check the numbers.");
  const sb = await serverClient();
  const { error } = await sb.from("settings").update({
    hold_minutes: v.data.hold_minutes, max_holds_per_session: v.data.max_holds, shipping_flat_cents: Math.round(v.data.shipping * 100),
    shipping_is_placeholder: form.get("shipping_placeholder") === "on", tax_rate: v.data.tax / 100, sold_visible_days: v.data.sold_days,
    allow_placeholder_prices: form.get("allow_placeholder") === "on",
    google_rating: v.data.rating ? Number(v.data.rating) : null, google_review_count: v.data.reviews ? Number(v.data.reviews) : null,
  }).eq("id", true);
  if (error) return fail(error.message);

  for (const slug of ["barrie", "newmarket", "toronto"]) {
    const hours: Record<string, [string, string]> = {};
    for (const d of DAYS) {
      const open = String(form.get(`${slug}_${d}_open`) ?? ""), close = String(form.get(`${slug}_${d}_close`) ?? "");
      if (form.get(`${slug}_${d}_closed`) !== "on" && /^\d{2}:\d{2}$/.test(open) && /^\d{2}:\d{2}$/.test(close)) hours[d] = [open, close];
    }
    await sb.from("stores").update({ hours, hours_confirmed: Object.keys(hours).length > 0 }).eq("slug", slug);
  }
  revalidateTag(SETTINGS_TAG); revalidateTag(PIECES_TAG);
  return done("Settings saved.");
}
