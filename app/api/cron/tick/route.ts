import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { sendDropAlert } from "@/lib/drops/alerts";
import { PIECES_TAG } from "@/lib/pieces/queries";
import { serviceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Fallback/companion to pg_cron: expire holds, open due drops, send drop alerts, refresh the static shop.
 * Call with `Authorization: Bearer $CRON_SECRET` (Vercel Cron does this automatically).
 */
export async function GET(req: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = serviceClient();
  const expired = await db.rpc("expire_holds");
  const drops = await db.rpc("release_due_drops");
  const { data: due } = await db.rpc("drops_needing_alert");
  let alerts = 0;
  for (const d of due ?? []) alerts += (await sendDropAlert(d.id)).sent;
  revalidateTag(PIECES_TAG);
  return NextResponse.json({ expired: expired.data, drops: drops.data, alerts });
}
