import type { Metadata } from "next";
import DriverApp from "@/components/DriverApp";
import PageHero from "@/components/PageHero";
import { getDriverSession } from "@/lib/driver-auth";

export const metadata: Metadata = { title: "Espace chauffeur", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const me = await getDriverSession();
  return (
    <>
      <PageHero eyebrow="Chauffeur" title={me ? `Bonjour ${me.name}` : "Espace chauffeur"} />
      <div className="wrap mt-6">
        <DriverApp loggedIn={!!me} />
      </div>
    </>
  );
}
