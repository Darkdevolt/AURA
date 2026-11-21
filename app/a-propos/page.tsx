import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "À propos" };

const POINTS = [
  {
    title: "Des véhicules électriques",
    text: "Silencieux, climatisés et sans émission en ville. Un trajet plus agréable pour vous, un Dakar plus respirable pour tous.",
  },
  {
    title: "Des chauffeurs professionnels",
    text: "Courtois, discrets et expérimentés, nos chauffeurs connaissent Dakar par cœur et vous conduisent en toute sécurité.",
  },
  {
    title: "La ponctualité avant tout",
    text: "Vous réservez à l'avance, nous arrivons à l'heure. Chaque course prévoit un temps d'approche et une marge pour ne jamais vous faire attendre.",
  },
  {
    title: "Un prix clair",
    text: "Le prix est estimé dès la réservation. Vous payez à la fin de la course, en espèces, par Wave ou Orange Money.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Notre maison" title="À propos de Luxus Asaad">
        Un service de chauffeur privé à Dakar : des trajets confortables, ponctuels et respectueux de
        l&apos;environnement, réservables en quelques secondes, sans application à installer.
      </PageHero>
      <div className="wrap mt-10 space-y-8">
        <div className="cells sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <div key={p.title} className="bg-white p-6">
              <span className="font-brand gold-text text-2xl">0{i + 1}</span>
              <h2 className="mt-3 text-[13px] font-bold uppercase tracking-[0.14em] text-ink">{p.title}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-neutral-700">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.14em]">Nos horaires</h2>
          <p className="mt-1 text-[15px] text-neutral-700">Du lundi au samedi, de 8h00 à 20h00. Jusqu&apos;à 4 passagers par course.</p>
        </div>
        <Link href="/#reserver" className="btn-primary w-full">Réserver une course</Link>
      </div>
    </>
  );
}
