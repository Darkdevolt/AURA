"use client";

import { waLink } from "@/lib/whatsapp";

/** Boutons du reçu (masqués à l'impression) : PDF et partage. */
export default function ReceiptActions({ url, phone, reference }: { url: string; phone: string; reference: string }) {
  const share = async () => {
    const text = `Mon reçu Luxus Asaad ${reference}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        /* partage annulé */
      }
    }
    window.open(waLink(phone, `${text} : ${url}`), "_blank");
  };
  return (
    <div className="grid grid-cols-2 gap-2 print:hidden">
      <button type="button" className="btn-gold" onClick={() => window.print()}>Télécharger (PDF)</button>
      <button type="button" className="btn-outline" onClick={share}>Partager</button>
      <p className="col-span-2 text-center text-xs text-neutral-500">PDF : choisissez « Enregistrer au format PDF ». Gardez ce lien, il reste valable.</p>
    </div>
  );
}
