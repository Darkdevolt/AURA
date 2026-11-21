import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-neutral-700">
        <p className="font-semibold text-ink">Luxus Asaad — VTC électrique à Dakar</p>
        <p className="mt-1">Du lundi au samedi, de 8h00 à 20h00.</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/mentions-legales" className="underline underline-offset-2">Mentions légales et confidentialité</Link>
          <Link href="/contact" className="underline underline-offset-2">Contact</Link>
        </p>
        <p className="mt-3 text-neutral-600">© {new Date().getFullYear()} Luxus Asaad</p>
      </div>
    </footer>
  );
}
