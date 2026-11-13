import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { serviceClient } from "@/lib/supabase/admin";

const MAX_BYTES = 12 * 1024 * 1024;
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]);

export interface ProcessedPhoto {
  path: string;
  width: number;
  height: number;
  blur: string;
}

/**
 * Upload pipeline: validate -> auto-rotate (EXIF) -> resize to <=1600 px -> WebP -> tiny blur placeholder
 * -> Storage. Runs only after the caller has been authorised. next/image then serves AVIF/WebP at the right size.
 */
export async function processAndStorePhoto(pieceId: string, file: File): Promise<ProcessedPhoto> {
  if (!OK_TYPES.has(file.type) && !file.type.startsWith("image/")) throw new Error("That file isn't an image");
  if (file.size > MAX_BYTES) throw new Error("Photo is too big (12 MB max)");
  const input = Buffer.from(await file.arrayBuffer());

  const out = await sharp(input, { failOn: "none" }).rotate().resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const blur = await sharp(out.data).resize(16).jpeg({ quality: 40 }).toBuffer();

  const path = `${pieceId}/${randomUUID()}.webp`;
  const { error } = await serviceClient().storage.from("piece-photos").upload(path, out.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, width: out.info.width, height: out.info.height, blur: `data:image/jpeg;base64,${blur.toString("base64")}` };
}

export async function removeStoredPhoto(path: string) {
  await serviceClient().storage.from("piece-photos").remove([path]);
}
