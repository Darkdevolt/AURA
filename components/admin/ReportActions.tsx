"use client";

export default function ReportActions({ excelHref }: { excelHref: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 print:hidden">
      <button type="button" className="btn-gold" onClick={() => window.print()}>
        Télécharger en PDF
      </button>
      <a className="btn-primary" href={excelHref}>
        Télécharger en Excel
      </a>
      <p className="col-span-2 text-xs text-neutral-500">
        PDF : choisissez « Enregistrer au format PDF » comme imprimante. Sur téléphone : Partager → Imprimer → PDF.
      </p>
    </div>
  );
}
