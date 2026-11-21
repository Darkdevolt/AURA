import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Tracker from "@/components/Tracker";

export const metadata: Metadata = { title: "Suivi de votre chauffeur", robots: { index: false, follow: false } };

export default async function TrackPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ k?: string }> }) {
  const { ref } = await params;
  const { k } = await searchParams;
  return (
    <>
      <PageHero eyebrow="Suivi en direct" title="Votre chauffeur" />
      <div className="wrap mt-6">
        {k ? <Tracker reference={ref.toUpperCase()} k={k} /> : <p className="alert-error">Lien de suivi incomplet.</p>}
      </div>
    </>
  );
}
