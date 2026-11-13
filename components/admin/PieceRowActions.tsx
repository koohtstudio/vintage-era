"use client";

import { useState, useTransition } from "react";
import { markSoldInStore, releaseHold, setPieceStatus } from "@/actions/admin/pieces";

export function PieceRowActions({ id, status }: { id: string; status: string }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => start(async () => { const r = await fn(); setMsg(r.message); setTimeout(() => setMsg(""), 2500); });
  return (
    <>
      {status === "live" && <button className="mini" disabled={pending} onClick={() => run(() => markSoldInStore(id))}>Mark sold in store</button>}
      {status === "held" && <button className="mini" disabled={pending} onClick={() => run(() => releaseHold(id))}>Release hold</button>}
      {status === "held" && <button className="mini" disabled={pending} onClick={() => run(() => markSoldInStore(id))}>Sold in store</button>}
      {status === "draft" && <button className="mini" disabled={pending} onClick={() => run(() => setPieceStatus(id, "live"))}>Publish</button>}
      {status === "live" && <button className="mini" disabled={pending} onClick={() => run(() => setPieceStatus(id, "draft"))}>Unpublish</button>}
      {(status === "draft" || status === "live") && <button className="mini danger" disabled={pending} onClick={() => run(() => setPieceStatus(id, "archived"))}>Archive</button>}
      {status === "archived" && <button className="mini" disabled={pending} onClick={() => run(() => setPieceStatus(id, "draft"))}>Restore</button>}
      {msg && <span className="mono" role="status" style={{ fontSize: 12, alignSelf: "center" }}>{msg}</span>}
    </>
  );
}
