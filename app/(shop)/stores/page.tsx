import type { Metadata } from "next";
import Image from "next/image";
import { MapEmbed } from "@/components/shop/MapEmbed";
import { getStores } from "@/lib/pieces/queries";
import { formatHours } from "@/lib/stores/hours";

export const revalidate = 300;
export const metadata: Metadata = { title: "Stores", description: "Era Vintage in Barrie, Newmarket and Toronto: hours, maps and Instagram." };

export default async function StoresPage() {
  const stores = await getStores();
  return (
    <main className="section dark" style={{ paddingTop: 50 }}>
      <div className="wrap">
        <p className="kick">Come dig in person</p>
        <h1 className="h2" style={{ marginBottom: 40 }}>Three <span className="g">stores.</span></h1>
        <div style={{ display: "grid", gap: 28 }}>
          {stores.map((s) => {
            const hours = formatHours(s.hours);
            return (
              <article key={s.id} className="store" style={{ flexDirection: "column" }} id={s.slug}>
                <div style={{ display: "grid", gap: 0 }} className="storerow">
                  {s.photo_path ? (
                    <div className="ph" style={{ height: 300 }}><Image src={s.photo_path} alt={`Inside Era Vintage ${s.name}`} fill sizes="100vw" style={{ objectFit: "cover" }} /></div>
                  ) : (
                    <div className="ph noimg" style={{ height: 300 }}>Photo of the {s.name} store goes here</div>
                  )}
                  <div className="sbody">
                    <h2 style={{ margin: 0, font: "400 44px var(--font-display)" }}>{s.name}</h2>
                    <p>{s.address}</p>
                    <ul className="mono" style={{ fontSize: 14, listStyle: "none", padding: 0, margin: "6px 0", lineHeight: 1.9 }}>
                      {(hours ?? ["[hours]"]).map((h) => <li key={h}>{h}</li>)}
                    </ul>
                    <p><a href={`https://www.instagram.com/${s.instagram}/`} rel="noopener noreferrer" style={{ color: "var(--color-lime)" }}>@{s.instagram} on Instagram</a></p>
                    <a className="btn btn-lime" style={{ alignSelf: "flex-start" }} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.maps_query)}`} rel="noopener noreferrer">Directions</a>
                    <MapEmbed query={s.maps_query} name={s.name} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
