import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { getCategories, getSettings, getShopPieces, getStores } from "@/lib/pieces/queries";

export const revalidate = 60;
export const metadata: Metadata = { title: "Shop", description: "Every piece is one of one. Filter by type, size, era and store." };

export default async function ShopPage() {
  const [pieces, categories, stores, settings] = await Promise.all([getShopPieces(), getCategories(), getStores(), getSettings()]);
  return (
    <main className="section" style={{ paddingTop: 50 }}>
      <div className="wrap">
        <p className="kick">The whole rack</p>
        <h1 className="h2" style={{ marginBottom: 30 }}>Shop <span className="g">everything.</span></h1>
        <Suspense fallback={<div className="shop" aria-busy="true" style={{ minHeight: 600 }} />}>
          <ShopBrowser
            pieces={pieces}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            stores={stores.map((s) => ({ slug: s.slug, name: s.name }))}
            soldVisibleDays={settings.sold_visible_days}
          />
        </Suspense>
      </div>
    </main>
  );
}
