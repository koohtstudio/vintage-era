import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { publicClient } from "@/lib/supabase/public";
import { toCardData, PIECE_SELECT } from "@/lib/pieces/queries";

export const dynamic = "force-dynamic";

/** One publicly visible piece as card data (used when a drop opens and new pieces appear live). RLS filters it. */
export async function GET(req: NextRequest) {
  const id = z.string().uuid().safeParse(req.nextUrl.searchParams.get("id"));
  if (!id.success) return NextResponse.json({ piece: null }, { status: 400 });
  const { data } = await publicClient().from("pieces").select(PIECE_SELECT).eq("id", id.data).maybeSingle();
  return NextResponse.json({ piece: data ? toCardData(data) : null }, { headers: { "Cache-Control": "no-store" } });
}
