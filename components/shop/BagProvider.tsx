"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addToBag, removeFromBag } from "@/actions/bag";
import type { BagLine } from "@/lib/bag";

interface BagCtx {
  lines: BagLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  count: number;
  now: number;
  inBag: (pieceId: string) => boolean;
  add: (pieceId: string) => Promise<void>;
  remove: (pieceId: string) => Promise<void>;
  toast: string;
  say: (msg: string) => void;
  holdMinutes: number;
  busy: string | null;
}

const Ctx = createContext<BagCtx | null>(null);
export function useBag(): BagCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBag must be used inside <BagProvider>");
  return c;
}

const hasBagCookie = () => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith("ev_has_bag="));

export function BagProvider({ holdMinutes, children }: { holdMinutes: number; children: ReactNode }) {
  const [lines, setLines] = useState<BagLine[]>([]);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  // Load my bag once (only if I've ever had one: avoids an API call for first-time visitors).
  useEffect(() => {
    if (!hasBagCookie()) return;
    fetch("/api/bag", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ lines: BagLine[] }>)
      .then((j) => setLines(j.lines))
      .catch(() => {});
  }, []);

  // Tick every second only while there is something to count down.
  useEffect(() => {
    if (lines.length === 0) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lines.length]);

  // When a hold runs out: drop it from the bag and tell the server so the piece goes back on the site.
  useEffect(() => {
    const expired = lines.filter((l) => new Date(l.expiresAt).getTime() <= now);
    if (expired.length === 0) return;
    setLines((cur) => cur.filter((l) => new Date(l.expiresAt).getTime() > now));
    say(expired.length === 1 ? `Your hold on ${expired[0]!.title} ran out.` : "A few holds ran out.");
    for (const l of expired) void removeFromBag(l.pieceId);
  }, [now, lines, say]);

  const add = useCallback(
    async (pieceId: string) => {
      setBusy(pieceId);
      try {
        const res = await addToBag(pieceId);
        if (res.ok) {
          setLines(res.lines);
          setNow(Date.now());
          say(`Held for you for ${holdMinutes} minutes`);
        } else say(res.message);
      } catch {
        say("Couldn't add that. Check your connection.");
      } finally {
        setBusy(null);
      }
    },
    [holdMinutes, say],
  );

  const remove = useCallback(async (pieceId: string) => {
    setLines((cur) => cur.filter((l) => l.pieceId !== pieceId));
    try {
      const res = await removeFromBag(pieceId);
      if (res.ok) setLines(res.lines);
    } catch {
      /* the hold simply expires on its own */
    }
  }, []);

  const value = useMemo<BagCtx>(
    () => ({ lines, open, setOpen, count: lines.length, now, inBag: (id) => lines.some((l) => l.pieceId === id), add, remove, toast, say, holdMinutes, busy }),
    [lines, open, now, add, remove, toast, say, holdMinutes, busy],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
