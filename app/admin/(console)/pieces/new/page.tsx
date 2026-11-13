import { createPiece } from "@/actions/admin/pieces";
import { PieceForm } from "@/components/admin/PieceForm";
import { requireStaff } from "@/lib/auth/staff";
import { serverClient } from "@/lib/supabase/server";

export const metadata = { title: "Add a piece" };

export default async function NewPiecePage() {
  const staff = await requireStaff();
  const sb = await serverClient();
  const [{ data: categories }, { data: stores }, { data: sellers }] = await Promise.all([
    sb.from("categories").select("id,name,measurement_kind").order("sort"),
    sb.from("stores").select("id,name").order("sort"),
    sb.from("sellers").select("id,name").eq("active", true).order("sort"),
  ]);
  return (
    <>
      <div className="ad-top"><h1>Add a piece</h1><span className="mono" style={{ fontSize: 12 }}>Takes about a minute</span></div>
      <div style={{ maxWidth: 720 }}>
        <PieceForm mode="create" action={createPiece} categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name, kind: c.measurement_kind }))} stores={stores ?? []} sellers={sellers ?? []} lockedStoreId={staff.role === "staff" ? staff.storeId : null} />
      </div>
    </>
  );
}
