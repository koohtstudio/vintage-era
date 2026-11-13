import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { demoLogin } from "@/actions/admin/auth";
import { MagicLinkForm } from "@/components/admin/MagicLinkForm";
import { getStaff } from "@/lib/auth/staff";
import { isMock } from "@/lib/mode";
import "../admin.css";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getStaff()) redirect("/admin");
  const err = (await searchParams).error;
  return (
    <main className="ad-login">
      <div className="ad-card">
        <Image src="/brand/era-vintage-logo.png" alt="Era Vintage" width={180} height={88} style={{ height: "auto", background: "#fff", borderRadius: 12, padding: 6 }} />
        <h1 className="display skew" style={{ fontSize: 44, margin: "18px 0 6px" }}>Staff only.</h1>
        {err && <p role="alert" style={{ color: "var(--color-hot)", fontWeight: 700 }}>That sign-in link didn&apos;t work. Ask for a new one.</p>}
        {isMock ? (
          <>
            <p className="mono" style={{ fontSize: 12 }}>MOCK MODE. Pick a demo account. No password.</p>
            <div style={{ display: "grid", gap: 10 }}>
              <form action={demoLogin.bind(null, "owner")}><button className="btn btn-lime" style={{ width: "100%" }}>Demo login: Owner (all stores)</button></form>
              <form action={demoLogin.bind(null, "barrie")}><button className="btn btn-white" style={{ width: "100%" }}>Demo login: Barrie staff</button></form>
              <form action={demoLogin.bind(null, "toronto")}><button className="btn btn-white" style={{ width: "100%" }}>Demo login: Toronto staff</button></form>
            </div>
          </>
        ) : (
          <MagicLinkForm />
        )}
      </div>
    </main>
  );
}
