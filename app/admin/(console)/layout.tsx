import "../admin.css";
import { AdminShell, type NavItem } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/auth/staff";
import { isMock } from "@/lib/mode";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const sb = await serverClient();
  const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "bagged", "packed"]);

  const nav: NavItem[] = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/pieces", label: "Pieces" },
    { href: "/admin/pieces/new", label: "+ Add a piece" },
    { href: "/admin/orders", label: "Online orders" },
    ...(staff.role === "owner"
      ? [
          { href: "/admin/drops", label: "Drops" },
          { href: "/admin/homepage", label: "Homepage" },
          { href: "/admin/subscribers", label: "Drop alerts list" },
          { href: "/admin/sellers", label: "Sellers" },
          { href: "/admin/settings", label: "Settings" },
        ]
      : []),
    ...(isMock ? [{ href: "/admin/outbox", label: "Outbox" }] : []),
  ];

  return (
    <AdminShell nav={nav} initialOpen={count ?? 0} who={{ name: staff.displayName, role: staff.role, store: staff.role === "owner" ? "All stores" : (staff.storeName ?? "") }}>
      {children}
    </AdminShell>
  );
}
