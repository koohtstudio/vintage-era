import type { Metadata, Viewport } from "next";
import { Racing_Sans_One, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const racing = Racing_Sans_One({ weight: "400", subsets: ["latin"], variable: "--font-racing", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-grotesk", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-spacemono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Era Vintage — find your era", template: "%s · Era Vintage" },
  description:
    "A vintage collective of Toronto-area sellers. Jerseys, varsity jackets, graphic tees, Y2K, denim, Pokémon and retro games. Every piece is one of one.",
  openGraph: { siteName: "Era Vintage", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0b0b0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${racing.variable} ${grotesk.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
