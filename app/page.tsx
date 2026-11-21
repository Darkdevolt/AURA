import BookingForm from "@/components/BookingForm";
import { getSettings, publicSettings } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = publicSettings(await getSettings());
  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Réservez votre chauffeur à Dakar</h1>
        <p className="mt-1.5 text-[15px] text-neutral-700">
          Véhicule 100 % électrique, chauffeur professionnel, prix annoncé à l&apos;avance. Paiement à la fin de la course.
        </p>
      </div>
      <BookingForm settings={settings} />
    </>
  );
}
