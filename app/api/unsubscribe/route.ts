import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe } from "@/actions/subscribe";

/** RFC 8058 one-click unsubscribe (mail clients POST here from the List-Unsubscribe header). */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = await unsubscribe(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
