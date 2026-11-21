import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/env";
import { validLines } from "@/lib/phone";
import { getSettings } from "@/lib/server-data";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL()),
  title: { default: `${BRAND.name} — Chauffeur privé à Dakar`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: {
    type: "website",
    locale: "fr_SN",
    siteName: BRAND.name,
    title: `${BRAND.name} — Chauffeur privé à Dakar`,
    description: BRAND.description,
  },
  twitter: { card: "summary_large_image" },
};

// Les numéros et réglages viennent de la base : rendu à chaque visite
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const lines = validLines(settings.contact_lines);
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Aller au contenu
        </a>
        <Header line={lines[0]} />
        <main id="contenu" className="flex-1">{children}</main>
        <Footer lines={lines} />
      </body>
    </html>
  );
}
