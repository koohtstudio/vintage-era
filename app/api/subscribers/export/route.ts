import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/staff";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const csv = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;

/** Owner-only CSV of subscribers (RLS also restricts the query to owners). */
export async function GET() {
  const staff = await getStaff();
  if (!staff || staff.role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data } = await (await serverClient()).from("subscribers").select("email,phone,source,consent_at,consent_text,unsubscribed_at").order("consent_at", { ascending: false });
  const rows = [["email", "phone", "source", "consent_at", "consent_text", "unsubscribed_at"], ...(data ?? []).map((s) => [s.email, s.phone, s.source, s.consent_at, s.consent_text, s.unsubscribed_at])];
  return new NextResponse(rows.map((r) => r.map(csv).join(",")).join("\n"), { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="era-vintage-subscribers.csv"', "Cache-Control": "no-store" } });
}
