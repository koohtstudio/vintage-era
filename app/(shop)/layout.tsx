import "../shop.css";
import { BagDrawer } from "@/components/shop/BagDrawer";
import { BagProvider } from "@/components/shop/BagProvider";
import { BagToast } from "@/components/shop/BagToast";
import { Footer } from "@/components/shop/Footer";
import { LiveProvider } from "@/components/shop/LiveProvider";
import { SiteHeader } from "@/components/shop/SiteHeader";
import { TabBar } from "@/components/shop/TabBar";
import { Ticker } from "@/components/ui/Ticker";
import { getSettings } from "@/lib/pieces/queries";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <LiveProvider initialNow={Date.now()}>
      <BagProvider holdMinutes={settings.hold_minutes}>
        <div className="ev" id="top">
          <Ticker messages={settings.ticker_messages} />
          <SiteHeader />
          {children}
          <Footer />
          <TabBar />
          <BagDrawer />
          <BagToast />
        </div>
      </BagProvider>
    </LiveProvider>
  );
}
