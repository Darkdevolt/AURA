import type { Metadata } from "next";
import { getSettings } from "@/lib/server-data";
import { formatSenegalPhone } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Nous contacter</h1>
      <p className="mt-2 text-[15px] text-neutral-700">
        Une question, une course particulière (aéroport, longue distance, mise à disposition) ? Écrivez-nous, nous
        répondons rapidement du lundi au samedi, de 8h00 à 20h00.
      </p>
      <div className="mt-5 space-y-3">
        <a className="btn-whatsapp w-full" href={waLink(s.whatsapp_number, "Bonjour Luxus Asaad, ")} target="_blank" rel="noopener noreferrer">
          WhatsApp : {formatSenegalPhone(s.whatsapp_number)}
        </a>
        <a className="btn-outline w-full" href={`tel:${s.phone_number}`}>
          Appeler le {formatSenegalPhone(s.phone_number)}
        </a>
      </div>
      <div className="card mt-5 text-[15px] text-neutral-700">
        <p><strong className="text-ink">Zone desservie :</strong> Dakar et environs, Aéroport AIBD sur réservation.</p>
        <p className="mt-2"><strong className="text-ink">Paiement :</strong> espèces, Wave ou Orange Money, à la fin de la course.</p>
      </div>
    </>
  );
}
