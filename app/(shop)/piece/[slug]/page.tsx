import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PieceActions } from "@/components/shop/PieceActions";
import { PieceGallery } from "@/components/shop/PieceGallery";
import { MEASUREMENT_FIELDS } from "@/lib/catalog/measurements";
import { conditionLabel } from "@/lib/catalog/options";
import { getPieceBySlug, getPieceSlugs } from "@/lib/pieces/queries";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPieceSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const piece = await getPieceBySlug((await params).slug);
  if (!piece) return { title: "Piece not found" };
  return { title: piece.title, description: `${piece.title}. Size ${piece.size}, ${piece.era}, ${conditionLabel(piece.condition)}. One of one at Era Vintage ${piece.storeName}.`, openGraph: { images: piece.cover ? [piece.cover.url] : [] } };
}

export default async function PiecePage({ params }: { params: Promise<{ slug: string }> }) {
  const piece = await getPieceBySlug((await params).slug);
  if (!piece) notFound();

  const fields = MEASUREMENT_FIELDS[piece.kind];
  const measured = fields.filter((f) => {
    const v = piece.measurements[f.key];
    return v !== undefined && v !== null && v !== "" && v !== false;
  });

  return (
    <main className="wrap">
      <p className="crumbs"><Link href="/shop">Shop</Link> / {piece.categoryName} / {piece.title}</p>
      <div className="piece">
        <PieceGallery photos={piece.photos} title={piece.title} />
        <div className="info">
          <p className="kick">{piece.era} · One of one</p>
          <h1 className="display skew" style={{ fontSize: "clamp(38px, 6vw, 64px)", margin: 0, lineHeight: 0.95 }}>{piece.title}</h1>
          <PieceActions piece={piece} />

          <dl className="spec">
            <div><dt>Size</dt><dd>{piece.size}</dd></div>
            <div><dt>Era</dt><dd>{piece.era}</dd></div>
            <div><dt>Condition</dt><dd>{conditionLabel(piece.condition)}</dd></div>
            <div><dt>At store</dt><dd>{piece.storeName}</dd></div>
          </dl>

          {measured.length > 0 && (
            <>
              <h2 className="mono" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".12em", margin: "22px 0 8px" }}>Measurements (laid flat)</h2>
              <dl className="spec">
                {measured.map((f) => {
                  const v = piece.measurements[f.key];
                  return (
                    <div key={f.key}>
                      <dt>{f.label}</dt>
                      <dd>{f.type === "number" ? `${v}${f.unit ? ` ${f.unit}` : ""}` : f.type === "boolean" ? "Yes" : String(v)}</dd>
                    </div>
                  );
                })}
              </dl>
            </>
          )}

          <div className="note"><b>Condition notes</b>{piece.conditionNotes || "No flaws noted. Check every photo, and ask us in store if you want more detail."}</div>
          <div className="note"><b>Authenticity notes</b>{piece.authenticityNotes || "Checked by the seller. Tags, stitching and hardware reviewed. Ask us in store if you want a closer look."}</div>
          {piece.sellerName && <p className="mono" style={{ fontSize: 12, color: "var(--color-mute)" }}>From the racks of {piece.sellerName}.</p>}
          <p style={{ lineHeight: 1.6, color: "#444" }}>{piece.description}</p>
        </div>
      </div>
    </main>
  );
}
