import { NextResponse, type NextRequest } from "next/server";
import { verifyOrderToken } from "@/lib/security/tokens";
import { serviceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Polling fallback for the order page. The HMAC check rejects guessed tokens without a DB hit. */
export async function GET(req: NextRequest) {
  const token = verifyOrderToken(req.nextUrl.searchParams.get("t") ?? "");
  if (!token) return NextResponse.json({ order: null }, { status: 404 });
  const { data } = await serviceClient().rpc("get_order_by_token", { p_token: token });
  return NextResponse.json({ order: data ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
