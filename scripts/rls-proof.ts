/**
 * Black-box RLS proof against the running local stack, using ONLY the public anon key
 * (exactly what any visitor's browser has). Every attempt below must be refused or return nothing.
 * Run: pnpm rls:proof
 */
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let failed = 0;
const row = (ok: boolean, label: string, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function cannotRead(table: string) {
  const { data, error } = await anon.from(table).select("*").limit(5);
  row(!!error || (data ?? []).length === 0, `anon cannot read ${table}`, error ? error.code : "0 rows");
}

async function main() {
  for (const t of ["orders", "order_items", "customers", "holds", "subscribers", "payment_events", "notifications_log", "profiles", "rate_limits", "drop_pieces", "piece_events"]) {
    await cannotRead(t);
  }

  const { data: pieces } = await anon.from("pieces").select("slug,status,price_cents");
  const statuses = new Set((pieces ?? []).map((p) => p.status));
  row(![...statuses].some((s) => s === "draft" || s === "archived"), "anon sees no draft/archived pieces", `${pieces?.length} visible, statuses: ${[...statuses].join(",")}`);
  row(!(pieces ?? []).some((p) => p.slug === "sega-genesis-console"), "a piece sold 10 days ago is hidden");

  const target = (pieces ?? []).find((p) => p.status === "live");
  if (target) {
    const price = await anon.from("pieces").update({ price_cents: 1 }).eq("slug", target.slug).select();
    row(!!price.error || (price.data ?? []).length === 0, "anon cannot change a price", price.error?.code ?? "0 rows");
    const status = await anon.from("pieces").update({ status: "sold" }).eq("slug", target.slug).select();
    row(!!status.error || (status.data ?? []).length === 0, "anon cannot change a status", status.error?.code ?? "0 rows");
    const check = await anon.from("pieces").select("price_cents,status").eq("slug", target.slug).single();
    row(check.data?.price_cents === target.price_cents && check.data?.status === "live", "piece is unchanged after the attempts");
  }

  const del = await anon.from("pieces").delete().neq("slug", "").select();
  row(!!del.error || (del.data ?? []).length === 0, "anon cannot delete pieces", del.error?.code ?? "0 rows");

  const ins = await anon.from("holds").insert({ piece_id: crypto.randomUUID(), session_id: crypto.randomUUID(), expires_at: new Date(Date.now() + 3.6e6).toISOString() });
  row(!!ins.error, "anon cannot insert a hold", ins.error?.code);
  const sub = await anon.from("subscribers").insert({ email: "x@example.test", consent_text: "x" });
  row(!!sub.error, "anon cannot insert a subscriber directly", sub.error?.code);

  const rpcs: [string, Record<string, unknown>][] = [
    ["create_hold", { p_piece: crypto.randomUUID(), p_session: crypto.randomUUID() }],
    ["release_hold", { p_piece: crypto.randomUUID(), p_session: crypto.randomUUID() }],
    ["get_my_bag", { p_session: crypto.randomUUID() }],
    ["finalize_order", { p_order: crypto.randomUUID(), p_payment_ref: "x" }],
    ["get_order_by_token", { p_token: "x" }],
    ["mark_sold_in_store", { p_piece: crypto.randomUUID() }],
    ["advance_order", { p_order: crypto.randomUUID(), p_action: "bag" }],
    ["expire_holds", {}],
    ["release_due_drops", {}],
  ];
  for (const [fn, args] of rpcs) {
    const r = await anon.rpc(fn, args);
    row(!!r.error, `anon cannot call ${fn}()`, r.error?.code);
  }

  const { data: me } = await anon.auth.getUser();
  row(!me.user, "anon has no user identity");

  console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nAll checks passed: the public client can read the shop and nothing else.");
  process.exit(failed ? 1 : 0);
}
main();
