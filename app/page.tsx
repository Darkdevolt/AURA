import BookingForm from "@/components/BookingForm";
import PhoneLines from "@/components/PhoneLines";
import { validLines } from "@/lib/phone";
import { getSettings, publicSettings } from "@/lib/server-data";

export const dynamic = "force-dynamic";

const PERKS = [
  {
    title: "100 % électrique",
    text: "Silencieux, climatisé, zéro émission.",
    icon: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  },
  {
    title: "Ponctuel",
    text: "Réservé à l'avance, à l'heure au rendez-vous.",
    icon: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  },
  {
    title: "Paiement à la fin",
    text: "Espèces, Wave ou Orange Money.",
    icon: (<><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10h19M6.5 15h3" /></>),
  },
];

const STEPS = [
  { n: "1", title: "Indiquez votre trajet", text: "Départ, destination : le prix s'affiche aussitôt." },
  { n: "2", title: "Choisissez l'heure", text: "Seuls les créneaux libres vous sont proposés." },
  { n: "3", title: "Confirmez", text: "Vous recevez un numéro de réservation, à envoyer sur WhatsApp." },
];

export default async function HomePage() {
  const all = await getSettings();
  const settings = publicSettings(all);
  const lines = validLines(all.contact_lines);

  return (
    <>
      {/* Bandeau d'accueil */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="wrap relative pb-24 pt-8 sm:pt-12">
          <p className="eyebrow !text-gold-light">VTC · Dakar</p>
          <h1 className="mt-3 font-display text-[2.1rem] font-bold leading-[1.1] sm:text-5xl">
            Votre chauffeur privé, <span className="gold-text">à l&apos;heure</span>.
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-neutral-300">
            Réservez votre course en quelques secondes. Véhicule électrique, chauffeur professionnel, prix annoncé à
            l&apos;avance et paiement à la fin du trajet.
          </p>
          <ul className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            {PERKS.map((p) => (
              <li key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gold-light">
                  {p.icon}
                </svg>
                <p className="mt-2 text-[13px] font-semibold leading-tight sm:text-sm">{p.title}</p>
                <p className="mt-0.5 hidden text-xs text-neutral-400 sm:block">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Formulaire (remonte sur le bandeau) */}
      <section id="reserver" aria-label="Réserver une course" className="wrap relative -mt-16">
        <BookingForm settings={settings} />
      </section>

      {/* Comment ça marche */}
      <section className="wrap mt-14" aria-labelledby="how">
        <p className="eyebrow">Simple et rapide</p>
        <h2 id="how" className="mt-1 font-display text-2xl font-bold sm:text-3xl">Comment ça marche</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card flex gap-4 sm:block">
              <span className="font-display text-3xl font-bold text-gold">{s.n}</span>
              <div className="sm:mt-2">
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 text-[15px] text-neutral-600">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Appeler */}
      {lines.length > 0 && (
        <section className="wrap mt-14" aria-labelledby="call">
          <div className="rounded-3xl bg-gradient-to-br from-ink to-ink-soft p-6 text-white sm:p-8">
            <p className="eyebrow !text-gold-light">Vous préférez appeler ?</p>
            <h2 id="call" className="mt-1 font-display text-2xl font-bold">Réservez par téléphone</h2>
            <p className="mt-2 text-[15px] text-neutral-300">Du lundi au samedi, de 8h00 à 20h00. Appel ou WhatsApp.</p>
            <div className="mt-5">
              <PhoneLines lines={lines} tone="dark" />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
