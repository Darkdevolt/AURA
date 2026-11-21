import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import PhoneLines from "@/components/PhoneLines";
import { validLines } from "@/lib/phone";
import { getSettings } from "@/lib/server-data";

export const metadata: Metadata = { title: "Contact" };
// Page pré-générée, rafraîchie toutes les 5 minutes (et immédiatement après un changement de réglages)
export const revalidate = 300;

export default async function ContactPage() {
  const s = await getSettings();
  const lines = validLines(s.contact_lines);
  return (
    <>
      <PageHero eyebrow="Contact" title="Appelez pour réserver">
        Une question, une course vers l&apos;aéroport AIBD, une mise à disposition ? Appelez-nous ou écrivez-nous sur
        WhatsApp, du lundi au samedi de 8h00 à 20h00.
      </PageHero>
      <div className="wrap mt-6 space-y-5">
        <PhoneLines lines={lines} />
        <div className="card space-y-2 text-[15px] text-neutral-700">
          <p><strong className="text-ink">Zone desservie :</strong> Dakar et environs, aéroport AIBD sur réservation.</p>
          <p><strong className="text-ink">Paiement :</strong> espèces, Wave ou Orange Money, à la fin de la course.</p>
        </div>
      </div>
    </>
  );
}
