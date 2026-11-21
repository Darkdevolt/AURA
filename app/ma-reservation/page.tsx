import type { Metadata } from "next";
import { Suspense } from "react";
import LookupForm from "@/components/LookupForm";
import PageHero from "@/components/PageHero";
import { bookingWhatsApp } from "@/lib/phone";
import { getSettings } from "@/lib/server-data";

export const metadata: Metadata = { title: "Ma réservation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyBookingPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero eyebrow="Suivi" title="Ma réservation">
        Saisissez votre numéro de réservation (ex. LA-0001) et votre téléphone pour consulter ou annuler votre course.
      </PageHero>
      <div className="wrap mt-6">
        <Suspense>
          <LookupForm whatsapp={bookingWhatsApp(settings)} />
        </Suspense>
      </div>
    </>
  );
}
