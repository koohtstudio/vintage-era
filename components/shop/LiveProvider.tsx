"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PieceCardData, PieceStatus } from "@/lib/pieces/types";

interface Override {
  status: PieceStatus;
  heldUntil: string | null;
  soldAt: string | null;
  justDroppedUntil: string | null;
  at: number;
}

interface LiveCtx {
  /** Coarse clock (every 5 s) used to expire holds and badges without a server event. */
  now: number;
  overrides: Record<string, Override>;
  hidden: ReadonlySet<string>;
  /** Pieces that appeared after the page was rendered (a drop opened, a piece was published). */
  incoming: PieceCardData[];
  connected: boolean;
  register: (ids: string[]) => void;
}

const Ctx = createContext<LiveCtx>({ now: 0, overrides: {}, hidden: new Set(), incoming: [], connected: false, register: () => {} });
export const useLive = () => useContext(Ctx);

interface PiecesRow {
  id: string; status: PieceStatus; held_until: string | null; sold_at: string | null; just_dropped_until: string | null;
}

/**
 * ONE realtime channel for the whole public site. It subscribes after the page is idle (so it costs
 * nothing on first paint) and feeds every card: "In a bag", "Sold", "Just dropped", new arrivals.
 */
export function LiveProvider({ initialNow, children }: { initialNow: number; children: ReactNode }) {
  const [now, setNow] = useState(initialNow);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [incoming, setIncoming] = useState<PieceCardData[]>([]);
  const [connected, setConnected] = useState(false);
  const known = useRef<Set<string>>(new Set());
  const fetching = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // Lets tests (and curious people in devtools) see whether the live channel is up.
  useEffect(() => {
    document.documentElement.dataset.live = connected ? "1" : "0";
  }, [connected]);

  const register = useCallback((ids: string[]) => {
    for (const id of ids) known.current.add(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const fetchNew = async (id: string) => {
      if (fetching.current.has(id)) return;
      fetching.current.add(id);
      try {
        const res = await fetch(`/api/shop/piece?id=${id}`, { cache: "no-store" });
        const json = (await res.json()) as { piece: PieceCardData | null };
        if (json.piece && !cancelled) {
          known.current.add(id);
          setIncoming((prev) => (prev.some((p) => p.id === id) ? prev : [json.piece!, ...prev]));
        }
      } finally {
        fetching.current.delete(id);
      }
    };

    const start = async () => {
      const { browserClient } = await import("@/lib/supabase/client");
      if (cancelled) return;
      const supabase = browserClient();
      const channel = supabase
        .channel("shop")
        .on("postgres_changes", { event: "*", schema: "public", table: "pieces" }, (payload) => {
          const row = payload.new as Partial<PiecesRow>;
          if (!row.id) return;
          setHidden((h) => {
            if (!h.has(row.id!)) return h;
            const n = new Set(h);
            n.delete(row.id!);
            return n;
          });
          setOverrides((o) => ({
            ...o,
            [row.id!]: {
              status: row.status ?? "live",
              heldUntil: row.held_until ?? null,
              soldAt: row.sold_at ?? null,
              justDroppedUntil: row.just_dropped_until ?? null,
              at: Date.now(),
            },
          }));
          if (!known.current.has(row.id)) void fetchNew(row.id);
        })
        .on("broadcast", { event: "piece_hidden" }, ({ payload }) => {
          const id = (payload as { id?: string }).id;
          if (id) setHidden((h) => new Set(h).add(id));
        })
        .subscribe((status) => setConnected(status === "SUBSCRIBED"));
      cleanup = () => void supabase.removeChannel(channel);
    };

    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = idle ? idle(() => void start(), { timeout: 2500 }) : window.setTimeout(() => void start(), 1200);
    return () => {
      cancelled = true;
      if (!idle) clearTimeout(handle);
      cleanup?.();
    };
  }, []);

  const value = useMemo(() => ({ now, overrides, hidden, incoming, connected, register }), [now, overrides, hidden, incoming, connected, register]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
