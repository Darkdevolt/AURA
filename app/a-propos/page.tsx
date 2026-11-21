import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "À propos" };

const POINTS = [
  {
    title: "100 % électrique",
    text: "Nous roulons en Leapmotor T03, une citadine électrique silencieuse et climatisée. Zéro émission en ville, pour un Dakar plus respirable.",
  },
  {
    title: "Un chauffeur professionnel",
    text: "Courtois, discret et expérimenté, votre chauffeur connaît Dakar par cœur et vous conduit en toute sécurité.",
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
      <h1 className="text-2xl font-extrabold">À propos de Luxus Asaad</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">
        Luxus Asaad est un service de VTC (voiture de transport avec chauffeur) basé à Dakar. Notre mission : vous offrir
        des trajets confortables, ponctuels et respectueux de l&apos;environnement, réservables en quelques secondes,
        sans application à installer.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="card">
            <h2 className="font-bold text-ink">{p.title}</h2>
            <p className="mt-1 text-[15px] text-neutral-700">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="card mt-5">
        <h2 className="font-bold">Nos horaires</h2>
        <p className="mt-1 text-[15px] text-neutral-700">Du lundi au samedi, de 8h00 à 20h00. Véhicule de 4 places passagers.</p>
      </div>
      <Link href="/" className="btn-primary mt-5 w-full">Réserver une course</Link>
    </>
  );
}
