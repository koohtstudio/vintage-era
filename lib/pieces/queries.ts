import "server-only";
import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/supabase/public";
import type { MeasurementKind } from "@/lib/catalog/measurements";
import { photoUrl } from "./photos";
import type { PhotoRef, PieceCardData, PieceDetail, PieceStatus } from "./types";

export const PIECES_TAG = "pieces";
export const SETTINGS_TAG = "settings";
const REVALIDATE = 60;

export const PIECE_SELECT = `
  id, slug, title, description, size, era, condition, condition_notes, authenticity_notes, measurements,
  price_cents, price_is_placeholder, status, held_until, live_at, just_dropped_until, sold_at, featured_rank,
  categories(slug, name, measurement_kind), stores(slug, name), sellers(name),
  piece_photos(kind, path, source, width, height, blur_data_url, position)
` as const;

type Row = {
  id: string; slug: string; title: string; description: string; size: string; era: string; condition: string;
  condition_notes: string; authenticity_notes: string; measurements: unknown; price_cents: number;
  price_is_placeholder: boolean; status: PieceStatus; held_until: string | null; live_at: string | null;
  just_dropped_until: string | null; sold_at: string | null; featured_rank: number | null;
  categories: { slug: string; name: string; measurement_kind: MeasurementKind } | null;
  stores: { slug: string; name: string } | null;
  sellers: { name: string } | null;
  piece_photos: { kind: string; path: string; source: "public" | "storage"; width: number | null; height: number | null; blur_data_url: string | null; position: number }[];
};

function toPhoto(p: Row["piece_photos"][number]): PhotoRef {
  return { url: photoUrl(p.path, p.source), width: p.width ?? 1000, height: p.height ?? 1000, blur: p.blur_data_url, kind: p.kind };
}

export const toCardData = (r: unknown) => toCard(r as Row);

function toCard(r: Row): PieceCardData {
  const photos = [...r.piece_photos].sort((a, b) => a.position - b.position);
  return {
    id: r.id, slug: r.slug, title: r.title,
    categorySlug: r.categories?.slug ?? "", categoryName: r.categories?.name ?? "", kind: r.categories?.measurement_kind ?? "tops",
    storeSlug: r.stores?.slug ?? "", storeName: r.stores?.name ?? "", sellerName: r.sellers?.name ?? null,
    size: r.size, era: r.era, condition: r.condition, priceCents: r.price_cents, pricePlaceholder: r.price_is_placeholder,
    status: r.status, heldUntil: r.held_until, liveAt: r.live_at, justDroppedUntil: r.just_dropped_until, soldAt: r.sold_at,
    featuredRank: r.featured_rank, measurements: (r.measurements ?? {}) as Record<string, unknown>,
    cover: photos[0] ? toPhoto(photos[0]) : null,
  };
}

/** Everything the anonymous catalog may show (RLS decides). Newest first. */
export const getShopPieces = unstable_cache(
  async (): Promise<PieceCardData[]> => {
    const { data, error } = await publicClient().from("pieces").select(PIECE_SELECT).order("live_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(`getShopPieces: ${error.message}`);
    return (data as unknown as Row[]).map(toCard);
  },
  ["shop-pieces"],
  { revalidate: REVALIDATE, tags: [PIECES_TAG] },
);

export const getFreshFinds = async (limit = 8): Promise<PieceCardData[]> => {
  const all = await getShopPieces();
  const rank = (p: PieceCardData) => p.featuredRank ?? 9999;
  return [...all]
    .filter((p) => p.status !== "sold")
    .sort((a, b) => rank(a) - rank(b) || (b.liveAt ?? "").localeCompare(a.liveAt ?? ""))
    .slice(0, limit);
};

export const getPieceBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<PieceDetail | null> => {
      const { data, error } = await publicClient().from("pieces").select(PIECE_SELECT).eq("slug", slug).maybeSingle();
      if (error) throw new Error(`getPieceBySlug: ${error.message}`);
      if (!data) return null;
      const r = data as unknown as Row;
      const photos = [...r.piece_photos].sort((a, b) => a.position - b.position).map(toPhoto);
      return { ...toCard(r), description: r.description, conditionNotes: r.condition_notes, authenticityNotes: r.authenticity_notes, photos };
    },
    ["piece", slug],
    { revalidate: REVALIDATE, tags: [PIECES_TAG, `piece:${slug}`] },
  )();

export const getPieceSlugs = unstable_cache(
  async () => {
    const { data } = await publicClient().from("pieces").select("slug");
    return (data ?? []).map((d) => d.slug);
  },
  ["piece-slugs"],
  { revalidate: REVALIDATE, tags: [PIECES_TAG] },
);

export const getSettings = unstable_cache(
  async () => {
    const { data, error } = await publicClient().from("settings").select("*").single();
    if (error || !data) throw new Error(`getSettings: ${error?.message}`);
    return data;
  },
  ["settings"],
  { revalidate: REVALIDATE, tags: [SETTINGS_TAG] },
);

export const getStores = unstable_cache(
  async () => {
    const { data, error } = await publicClient().from("stores").select("*").order("sort");
    if (error) throw new Error(`getStores: ${error.message}`);
    return data ?? [];
  },
  ["stores"],
  { revalidate: 300, tags: [SETTINGS_TAG] },
);

export const getSellers = unstable_cache(
  async () => {
    const { data } = await publicClient().from("sellers").select("*").eq("active", true).order("sort");
    return data ?? [];
  },
  ["sellers"],
  { revalidate: 300, tags: [SETTINGS_TAG] },
);

export const getCategories = unstable_cache(
  async () => {
    const { data } = await publicClient().from("categories").select("*").order("sort");
    return data ?? [];
  },
  ["categories"],
  { revalidate: 300, tags: [SETTINGS_TAG] },
);

export const getReviews = unstable_cache(
  async () => {
    const { data } = await publicClient().from("reviews").select("*").order("sort");
    return data ?? [];
  },
  ["reviews"],
  { revalidate: 300, tags: [SETTINGS_TAG] },
);

export const getNextDrop = unstable_cache(
  async () => {
    const { data } = await publicClient()
      .from("drops")
      .select("id, name, starts_at, status")
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  },
  ["next-drop"],
  { revalidate: REVALIDATE, tags: [PIECES_TAG] },
);
