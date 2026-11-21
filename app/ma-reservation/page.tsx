import type { Metadata } from "next";
import { Suspense } from "react";
import LookupForm from "@/components/LookupForm";
import { getSettings } from "@/lib/server-data";

export const metadata: Metadata = { title: "Ma réservation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyBookingPage() {
  const settings = await getSettings();
  return (
    <>
      <h1 className="mb-1.5 text-2xl font-extrabold">Ma réservation</h1>
      <p className="mb-5 text-[15px] text-neutral-700">
        Saisissez votre numéro de réservation (ex. LA-0001) et votre téléphone pour consulter ou annuler votre course.
      </p>
      <Suspense>
        <LookupForm whatsapp={settings.whatsapp_number} />
      </Suspense>
    </>
  );
}
