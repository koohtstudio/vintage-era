"use client";

import Image from "next/image";
import { useState } from "react";
import type { PhotoRef } from "@/lib/pieces/types";

const KIND_LABEL: Record<string, string> = { front: "Front", back: "Back", tag: "Tag", flaw: "Flaw", detail: "Detail" };

export function PieceGallery({ photos, title }: { photos: PhotoRef[]; title: string }) {
  const [i, setI] = useState(0);
  const cur = photos[i];
  if (!cur) return <div className="gallery"><div className="main" /></div>;
  return (
    <div className="gallery">
      <div className="main">
        <Image src={cur.url} alt={`${title}, ${KIND_LABEL[cur.kind] ?? "photo"}`} fill priority sizes="(min-width: 820px) 50vw, 100vw" placeholder={cur.blur ? "blur" : "empty"} blurDataURL={cur.blur ?? undefined} style={{ objectFit: "cover" }} />
      </div>
      {photos.length > 1 && (
        <div className="thumbs" role="group" aria-label="Photos">
          {photos.map((p, idx) => (
            <button key={p.url + idx} aria-pressed={idx === i} onClick={() => setI(idx)} aria-label={`Show ${KIND_LABEL[p.kind] ?? "photo"} photo`}>
              <Image src={p.url} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
