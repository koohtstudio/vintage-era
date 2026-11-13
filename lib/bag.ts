import "server-only";
import { serviceClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/pieces/photos";

export interface BagLine {
  pieceId: string;
  slug: string;
  title: string;
  size: string;
  priceCents: number;
  pricePlaceholder: boolean;
  storeSlug: string;
  storeName: string;
  expiresAt: string;
  cover: { url: string; blur: string | null } | null;
}

interface Raw {
  piece_id: string; slug: string; title: string; size: string; price_cents: number; price_is_placeholder: boolean;
  store: string; store_name: string; expires_at: string; cover_path: string | null; cover_source: "public" | "storage" | null; cover_blur: string | null;
}

/** The shopper's own live holds (the only way holds are ever read). */
export async function loadBag(sessionId: string): Promise<BagLine[]> {
  const { data, error } = await serviceClient().rpc("get_my_bag", { p_session: sessionId });
  if (error) throw new Error(`get_my_bag: ${error.message}`);
  return ((data as unknown as Raw[]) ?? []).map((r) => ({
    pieceId: r.piece_id, slug: r.slug, title: r.title, size: r.size, priceCents: r.price_cents, pricePlaceholder: r.price_is_placeholder,
    storeSlug: r.store, storeName: r.store_name, expiresAt: r.expires_at,
    cover: r.cover_path ? { url: photoUrl(r.cover_path, r.cover_source ?? "public"), blur: r.cover_blur } : null,
  }));
}
