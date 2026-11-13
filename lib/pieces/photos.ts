/** Seed photos live in /public (source=public); uploaded ones live in the Supabase Storage bucket. */
export function photoUrl(path: string, source: "public" | "storage"): string {
  if (source === "public") return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/piece-photos/${path}`;
}
