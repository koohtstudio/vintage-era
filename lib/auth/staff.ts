import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";

export interface Staff {
  id: string;
  email: string;
  role: "owner" | "staff";
  storeId: string | null;
  storeName: string | null;
  displayName: string;
}

/** The signed-in staff member (or null). Verified with Supabase, not just read from a cookie. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const sb = await serverClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data: p } = await sb.from("profiles").select("role, store_id, display_name, stores(name)").eq("id", auth.user.id).maybeSingle();
  if (!p) return null; // signed in but not staff
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    role: p.role,
    storeId: p.store_id,
    storeName: (p.stores as unknown as { name: string } | null)?.name ?? null,
    displayName: p.display_name,
  };
});

/** Pages: redirect to login. Called again inside EVERY server action (middleware alone is never trusted). */
export async function requireStaff(): Promise<Staff> {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  return s;
}

export async function requireOwner(): Promise<Staff> {
  const s = await requireStaff();
  if (s.role !== "owner") redirect("/admin?denied=owner");
  return s;
}

/** Server actions: throw instead of redirect so a forged call gets a clean failure. */
export async function assertStaff(): Promise<Staff> {
  const s = await getStaff();
  if (!s) throw new Error("Not signed in");
  return s;
}
export async function assertOwner(): Promise<Staff> {
  const s = await assertStaff();
  if (s.role !== "owner") throw new Error("Owner only");
  return s;
}
