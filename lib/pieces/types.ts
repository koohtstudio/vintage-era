import type { MeasurementKind } from "@/lib/catalog/measurements";

export type PieceStatus = "draft" | "live" | "held" | "sold" | "archived";

export interface PhotoRef {
  url: string;
  width: number;
  height: number;
  blur: string | null;
  kind: string;
}

/** What a shop card needs (kept small: the whole catalog is shipped to the filter island). */
export interface PieceCardData {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  kind: MeasurementKind;
  storeSlug: string;
  storeName: string;
  sellerName: string | null;
  size: string;
  era: string;
  condition: string;
  priceCents: number;
  pricePlaceholder: boolean;
  status: PieceStatus;
  heldUntil: string | null;
  liveAt: string | null;
  justDroppedUntil: string | null;
  soldAt: string | null;
  featuredRank: number | null;
  measurements: Record<string, unknown>;
  cover: PhotoRef | null;
}

export interface PieceDetail extends PieceCardData {
  description: string;
  conditionNotes: string;
  authenticityNotes: string;
  photos: PhotoRef[];
}
