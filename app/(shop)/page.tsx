import Image from "next/image";
import Link from "next/link";
import { AlertSignup } from "@/components/shop/AlertSignup";
import { DropCountdown } from "@/components/shop/DropCountdown";
import { FreshFinds } from "@/components/shop/FreshFinds";
import { isMock } from "@/lib/mode";
import { getCategories, getFreshFinds, getNextDrop, getReviews, getSellers, getSettings, getStores } from "@/lib/pieces/queries";
import { formatHours } from "@/lib/stores/hours";

export const revalidate = 60;

export default async function HomePage() {
  const [fresh, settings, stores, sellers, reviews, drop, categories] = await Promise.all([
    getFreshFinds(8), getSettings(), getStores(), getSellers(), getReviews(), getNextDrop(), getCategories(),
  ]);
  const now = Date.now();
  const shownSellers = sellers.filter((s) => isMock || !s.is_placeholder);
  const shownReviews = reviews.filter((r) => isMock || r.confirmed);
  const marquee = [...categories, ...categories];

  return (
    <main>
      <section className="hero">
        <div className="stripes" aria-hidden="true"><i /><i /><i /></div>
        <div className="wrap grid">
          <div>
            <span className="tag up d1">Vintage collective · Toronto, Newmarket, Barrie</span>
            <h1 className="h1 up d2"><span className="g">Find</span><span>your</span><span className="p">era.</span></h1>
            <p className="lede up d3">
              Curated vintage from Toronto sellers under one roof. Jerseys, jackets, Y2K, denim, toys and the stuff you forgot you loved. Now shoppable online, every piece one of one.
            </p>
            <div className="up d4" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link className="btn btn-lime" href="/shop">Shop the drop</Link>
              <Link className="btn btn-white" href="/stores">Find a store</Link>
            </div>
          </div>
          <div className="collage up d3">
            {[
              { cls: "p1", src: "/photos/northstars-varsity.jpg", alt: "Green Northstars varsity jacket", cap: "Varsity, 90s" },
              { cls: "p2", src: "/photos/giants-jacket.jpg", alt: "Blue NY Giants satin jacket", cap: "NFL, 80s" },
              { cls: "p3", src: "/photos/ferrari-tee.jpg", alt: "Black Ferrari graphic tee", cap: "Racing tee" },
            ].map((p) => (
              <div className={`pol ${p.cls}`} key={p.cls}>
                <div className="im"><Image src={p.src} alt={p.alt} fill priority sizes="(min-width: 820px) 300px, 190px" style={{ objectFit: "cover" }} /></div>
                <span className="cap">{p.cap}</span>
              </div>
            ))}
            <div className="sticker s1" aria-hidden="true">1 OF<br />1</div>
            <div className="sticker s2" aria-hidden="true">NEW<br />IN</div>
          </div>
        </div>
      </section>
      <div className="check" aria-hidden="true" />

      <div className="cats" aria-label="Shop by category">
        <div className="track track-slow">
          {marquee.map((c, i) => (
            <Link className="cat" key={`${c.slug}-${i}`} href={`/shop?type=${c.slug}`} aria-hidden={i >= categories.length ? true : undefined} tabIndex={i >= categories.length ? -1 : undefined}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <section className="section" id="fresh">
        <div className="wrap">
          <div className="head">
            <div><p className="kick">This week&apos;s racks</p><h2 className="h2">Fresh <span className="g">finds.</span></h2></div>
            <p style={{ maxWidth: 400, margin: 0, color: "#444", lineHeight: 1.6 }}>
              Every piece is measured, condition-checked and photographed on the rack. Tap a piece for measurements.
            </p>
          </div>
          <FreshFinds pieces={fresh} soldVisibleDays={settings.sold_visible_days} />
          <p style={{ textAlign: "center", marginTop: 34 }}><Link className="btn btn-ink" href="/shop">See everything</Link></p>
        </div>
      </section>

      <section className="dropband" id="drop" aria-label="Next drop">
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p className="kick" style={{ color: "var(--color-ink)" }}>Next drop</p>
            <h2 className="display skew" style={{ fontSize: "clamp(40px, 7vw, 64px)", margin: 0, lineHeight: 0.95 }}>{drop ? drop.name : "Nothing scheduled yet"}</h2>
            {drop && (
              <p className="mono" style={{ margin: "8px 0 0", fontSize: 13 }}>
                {new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", weekday: "long", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }).format(new Date(drop.starts_at))}
              </p>
            )}
          </div>
          {drop ? <DropCountdown startsAt={drop.starts_at} initialNow={now} /> : <Link className="btn btn-ink" href="/alerts">Get alerts</Link>}
        </div>
      </section>

      <section className="section dark" id="stores">
        <div className="wrap">
          <p className="kick">Come dig in person</p>
          <h2 className="h2">Three <span className="g">stores.</span></h2>
          <div className="stores">
            {stores.map((s) => {
              const hours = formatHours(s.hours);
              return (
                <article className="store" key={s.id}>
                  {s.photo_path ? (
                    <div className="ph"><Image src={s.photo_path} alt={`Inside Era Vintage ${s.name}`} fill sizes="(min-width: 820px) 33vw, 100vw" style={{ objectFit: "cover" }} /></div>
                  ) : (
                    <div className="ph noimg">Photo of the {s.name} store goes here</div>
                  )}
                  <div className="sbody">
                    <h3>{s.name}</h3>
                    <p>{s.address}</p>
                    <p className="mono" style={{ fontSize: 13 }}>{hours ? hours.join(" · ") : "[hours]"}</p>
                    <a href={`https://www.instagram.com/${s.instagram}/`} rel="noopener noreferrer" style={{ color: "var(--color-lime)" }}>@{s.instagram}</a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" id="collective">
        <div className="wrap collective">
          <div>
            <p className="kick">The collective</p>
            <h2 className="h2">{shownSellers.length === 4 ? "Four" : shownSellers.length} sellers, <span className="g">one roof.</span></h2>
            <p style={{ color: "#444", lineHeight: 1.7, margin: "22px 0 20px" }}>
              Era Vintage is a collective of vintage sellers who pooled their best pieces into one shop. Different eyes, different eras, all on the same racks.
            </p>
            {shownSellers.map((s) => (
              <div className="seller" key={s.id}>
                {s.name}
                <small>{s.instagram.startsWith("[") ? s.instagram : `@${s.instagram}`}</small>
              </div>
            ))}
          </div>
          <div className="bigimg"><Image src="/photos/team-in-store.jpg" alt="The Era Vintage team together in the store" fill sizes="(min-width: 820px) 45vw, 100vw" style={{ objectFit: "cover" }} /></div>
        </div>
      </section>

      {shownReviews.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <p className="kick">{settings.google_rating ? `${settings.google_rating} stars · ${settings.google_review_count} Google reviews` : "Google reviews"}</p>
            <h2 className="h2">The <span className="g">word.</span></h2>
            <div className="revs">
              {shownReviews.slice(0, 3).map((r) => (
                <blockquote className="rev" key={r.id}>
                  <p>“{r.quote}”</p>
                  <cite>{r.author ? `${r.author} · ` : "From "}Google{isMock && !r.confirmed ? " · sample (confirm)" : ""}</cite>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }} id="alerts">
        <div className="wrap">
          <div className="alert">
            <div>
              <h3>Never miss a drop.</h3>
              <p style={{ margin: "12px 0 0", lineHeight: 1.6 }}>Get a text or email when new jerseys, jackets and grails hit the site. One of one goes fast.</p>
            </div>
            <AlertSignup source="home" />
          </div>
        </div>
      </section>
    </main>
  );
}
