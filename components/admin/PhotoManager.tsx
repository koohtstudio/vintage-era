"use client";

import Image from "next/image";
import { useTransition } from "react";
import { deletePhoto, makeCover } from "@/actions/admin/pieces";

export function PhotoManager({ pieceId, photos }: { pieceId: string; photos: { id: string; url: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="thumbs2" aria-busy={pending}>
      {photos.map((p, i) => (
        <div className="t" key={p.id}>
          <Image src={p.url} alt={`Photo ${i + 1}`} fill sizes="80px" style={{ objectFit: "cover" }} />
          <button type="button" aria-label={`Delete photo ${i + 1}`} onClick={() => start(async () => { await deletePhoto(p.id); })}>✕</button>
          {i > 0 && <button type="button" style={{ top: "auto", bottom: 2, width: "auto", padding: "0 8px", borderRadius: 999 }} onClick={() => start(async () => { await makeCover(p.id, pieceId); })}>Cover</button>}
        </div>
      ))}
    </div>
  );
}
