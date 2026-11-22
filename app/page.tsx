import BookingForm from "@/components/BookingForm";
import Car3D from "@/components/Car3D";
import { getSettings, publicSettings } from "@/lib/server-data";

// Page pré-générée, rafraîchie toutes les 5 minutes (et immédiatement après un changement de réglages)
export const revalidate = 300;

const PERKS = ["100 % électrique", "Ponctualité", "Paiement à la fin"];

const STEPS = [
  { n: "01", title: "Votre trajet", text: "Départ et destination : le prix s'affiche aussitôt." },
  { n: "02", title: "Votre horaire", text: "Seuls les créneaux libres vous sont proposés." },
  { n: "03", title: "Confirmation", text: "Un numéro de réservation, envoyé sur WhatsApp en un geste." },
];

export default async function HomePage() {
  const all = await getSettings();
  const settings = publicSettings(all);

  return (
    <>
      {/* Bandeau d'accueil */}
      <section className="relative overflow-hidden bg-ink-grad text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_90%_10%,rgba(196,138,22,0.28),transparent_70%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img aria-hidden src="/lion-light.png" alt="" width={534} height={447}
          className="pointer-events-none absolute -right-20 bottom-0 w-[24rem] max-w-none opacity-[0.08] sm:-right-6 sm:w-[32rem]" />
        <div className="wrap relative pb-14 pt-12 sm:pb-20 sm:pt-16">
          <p className="eyebrow !text-gold-light">Chauffeur privé · Dakar</p>
          <h1 className="font-brand mt-4 text-[2.15rem] leading-[1.05] sm:text-6xl">
            Voyagez
            <br />
            <span className="gold-text">en roi.</span>
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-neutral-300">
            Réservez votre chauffeur en quelques secondes. Véhicule électrique, prix annoncé à l&apos;avance, paiement à
            la fin de la course.
          </p>
          <a href="#reserver" className="btn-gold mt-8">Réserver une course</a>
          <ul className="mt-12 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5 text-center text-[10px] font-semibold uppercase tracking-[0.07em] text-neutral-300 sm:text-[12px]">
            {PERKS.map((p) => (
              <li key={p} className="px-2">{p}</li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="gold-rule" />
      </section>

      {/* Réservation */}
      <section id="reserver" aria-labelledby="reserver-titre" className="wrap scroll-mt-28 pt-12">
        <p className="eyebrow">Réservation en ligne</p>
        <h2 id="reserver-titre" className="font-brand mt-2 text-2xl sm:text-3xl">Réserver une course</h2>
        <div className="mt-8">
          <BookingForm settings={settings} />
        </div>
      </section>

      {/* Notre véhicule : maquette 3D */}
      <section aria-labelledby="vehicule" className="mt-20">
        <div className="wrap">
          <p className="eyebrow">Notre véhicule</p>
          <h2 id="vehicule" className="font-brand mt-2 text-2xl sm:text-3xl">Leapmotor T03</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-700">
            Une citadine 100 % électrique, silencieuse et climatisée, idéale pour circuler dans Dakar. Faites-la tourner pour
            la découvrir sous tous les angles.
          </p>
        </div>
        <div className="mx-auto mt-6 w-full max-w-5xl sm:px-5">
          <Car3D className="h-[300px] border-y border-line sm:h-[420px] sm:border" />
        </div>
        <ul className="wrap mt-4 grid grid-cols-3 divide-x divide-line border border-line text-center">
          {[["100 %", "électrique"], ["0", "bruit moteur"], ["Clim", "à bord"]].map(([a, b]) => (
            <li key={b} className="px-2 py-3">
              <p className="font-brand gold-text text-lg">{a}</p>
              <p className="text-[11px] uppercase tracking-[0.06em] text-neutral-500">{b}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Comment ça marche */}
      <section className="wrap mt-20" aria-labelledby="how">
        <p className="eyebrow">Simple et rapide</p>
        <h2 id="how" className="font-brand mt-2 text-2xl sm:text-3xl">Comment ça marche</h2>
        <ol className="mt-8 grid border-t border-line sm:grid-cols-3 sm:border-t-0">
          {STEPS.map((s) => (
            <li key={s.n} className="border-b border-line py-6 sm:border-b-0 sm:border-l sm:px-6 sm:py-2 sm:first:border-l-0 sm:first:pl-0">
              <span className="font-brand gold-text text-3xl">{s.n}</span>
              <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.07em]">{s.title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

    </>
  );
}
