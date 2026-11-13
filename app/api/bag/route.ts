import { NextResponse } from "next/server";
import { loadBag } from "@/lib/bag";
import { getShopperSession } from "@/lib/security/session";

export const dynamic = "force-dynamic";

/** The signed-in-by-cookie shopper's own bag. Anyone without a valid cookie just gets an empty bag. */
export async function GET() {
  const sid = await getShopperSession();
  const lines = sid ? await loadBag(sid) : [];
  return NextResponse.json({ lines }, { headers: { "Cache-Control": "private, no-store" } });
}
