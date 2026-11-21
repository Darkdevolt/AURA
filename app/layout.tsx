import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL()),
  title: { default: `${BRAND.name} — VTC électrique à Dakar`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: {
    type: "website",
    locale: "fr_SN",
    siteName: BRAND.name,
    title: `${BRAND.name} — VTC électrique à Dakar`,
    description: BRAND.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[2000] focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Aller au contenu
        </a>
        <Header />
        <main id="contenu" className="mx-auto max-w-3xl px-4 py-5">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
