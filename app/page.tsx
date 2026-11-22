import BookingForm from "@/components/BookingForm";
import VehicleGallery from "@/components/VehicleGallery";
import { formatFcfa } from "@/lib/pricing";
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

      {/* Notre véhicule */}
      <section aria-labelledby="vehicule" className="mt-20">
        <div className="wrap">
          <p className="eyebrow">Notre véhicule</p>
          <h2 id="vehicule" className="font-brand mt-2 text-2xl sm:text-3xl">Leapmotor T03</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-700">
            Une citadine 100 % électrique, silencieuse et climatisée, idéale pour circuler dans Dakar.
          </p>
        </div>
        <div className="mx-auto mt-6 w-full max-w-5xl sm:px-5">
          <VehicleGallery />
        </div>
        <ul className="cells mx-auto mt-6 w-[calc(100%-2.5rem)] max-w-3xl grid-cols-3 text-center">
          {[["100 %", "électrique"], ["0", "bruit moteur"], ["Clim", "à bord"]].map(([a, b]) => (
            <li key={b} className="bg-white px-2 py-3">
              <p className="font-brand gold-text text-lg">{a}</p>
              <p className="text-[11px] uppercase tracking-[0.06em] text-neutral-500">{b}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Mise à disposition avec chauffeur */}
      {(all.half_day_enabled || all.full_day_enabled) && (
        <section className="relative mt-20 overflow-hidden bg-ink-grad text-white" aria-labelledby="dispo">
          <div aria-hidden className="gold-rule" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_100%,rgba(196,138,22,0.22),transparent_70%)]" />
          <div className="wrap relative py-14">
            <p className="eyebrow !text-gold-light">Diaspora · voyageurs · affaires</p>
            <h2 id="dispo" className="font-brand mt-2 text-2xl leading-tight sm:text-3xl">Un chauffeur pour la journée</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-300">
              Vous arrivez à l&apos;aéroport AIBD ? Votre chauffeur vous attend, puis reste à votre disposition : hôtel,
              famille, rendez-vous, démarches, visites. Un véhicule et un chauffeur rien que pour vous, à prix fixe.
            </p>
            <div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2">
              {[
                { key: "demi_journee", on: all.half_day_enabled, title: "Demi-journée", hours: all.half_day_hours, price: all.half_day_price },
                { key: "journee", on: all.full_day_enabled, title: "Journée", hours: all.full_day_hours, price: all.full_day_price },
              ].filter((o) => o.on).map((o) => (
                <a key={o.key} href={`/?service=${o.key}#reserver`} className="group block bg-ink p-6 transition hover:bg-ink-soft">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{o.title} · {o.hours} h avec chauffeur</p>
                  <p className="font-brand gold-text mt-2 text-3xl">{formatFcfa(o.price)}</p>
                  <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-white underline-offset-4 group-hover:underline">Réserver →</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

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
