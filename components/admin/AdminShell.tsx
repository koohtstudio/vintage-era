"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/actions/admin/auth";
import { browserClient } from "@/lib/supabase/client";

export interface NavItem { href: string; label: string }

/** Two-tone chime from WebAudio (no audio file to ship). Browsers only allow it after a first tap. */
function chime(ctx: AudioContext) {
  [660, 880].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f; o.type = "sine";
    g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.16 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.3);
    o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.16); o.stop(ctx.currentTime + i * 0.16 + 0.32);
  });
}

/**
 * Admin chrome + live sync. One realtime channel for staff:
 *  - any change to pieces (from any staff device in any store) refreshes the open page
 *  - a newly PAID order shows a toast, bumps the badge, and chimes
 */
export function AdminShell({ nav, who, initialOpen, children }: { nav: NavItem[]; who: { name: string; store: string; role: string }; initialOpen: number; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [toast, setToast] = useState("");
  const [sound, setSound] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const soundRef = useRef(true);

  useEffect(() => { setOpen(initialOpen); }, [initialOpen]);
  useEffect(() => { try { const v = localStorage.getItem("ev_admin_sound"); if (v === "off") { setSound(false); soundRef.current = false; } } catch {} }, []);
  useEffect(() => {
    const unlock = () => { audio.current ??= new AudioContext(); void audio.current.resume(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const refresh = useCallback(() => { clearTimeout(refreshTimer.current); refreshTimer.current = setTimeout(() => router.refresh(), 350); }, [router]);

  useEffect(() => {
    const sb = browserClient();
    const ch = sb.channel("admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "pieces" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as { id?: string; number?: string; status?: string };
        refresh();
        if (row.id && row.status === "paid" && !seen.current.has(row.id)) {
          seen.current.add(row.id);
          setOpen((n) => n + 1);
          setToast(`New online order ${row.number ?? ""}`);
          setTimeout(() => setToast(""), 5000);
          if (soundRef.current && audio.current) chime(audio.current);
        }
      })
      .subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [refresh]);

  return (
    <div className="ad">
      <aside className="ad-side">
        <Image className="brand" src="/brand/era-vintage-logo.png" alt="Era Vintage" width={150} height={73} style={{ height: "auto" }} />
        <nav className="ad-nav" aria-label="Admin">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={(n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)) ? "page" : undefined}>
              {n.label}
              {n.href === "/admin/orders" && open > 0 ? <span className="n" aria-label={`${open} to do`}>{open}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="ad-who">
          Signed in as {who.role}<b>{who.store}</b>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="mini" onClick={() => { const v = !sound; setSound(v); soundRef.current = v; try { localStorage.setItem("ev_admin_sound", v ? "on" : "off"); } catch {} if (v && audio.current) chime(audio.current); }}>Sound {sound ? "on" : "off"}</button>
            <form action={signOut}><button className="mini">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="ad-main">{children}</main>
      <div className={`ad-toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast || " "}</div>
    </div>
  );
}
