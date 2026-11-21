import Link from "next/link";
import Logo from "./Logo";
import PhoneLines from "./PhoneLines";
import type { ContactLine } from "@/lib/types";

export default function Footer({ lines }: { lines: ContactLine[] }) {
  return (
    <footer className="bg-ink-grad text-neutral-400">
      <div aria-hidden className="gold-rule" />
      <div className="wrap grid gap-10 py-12 sm:grid-cols-2">
        <div>
          <Logo variant="full" height={104} alt="Luxus Asaad" />
          <p className="mt-5 text-sm leading-relaxed">
            Chauffeur privé en véhicule électrique à Dakar.
            <br />
            Du lundi au samedi, de 8h00 à 20h00.
          </p>
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.07em]">
            <Link href="/ma-reservation" className="hover:text-white">Ma réservation</Link>
            <Link href="/a-propos" className="hover:text-white">À propos</Link>
            <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
          </p>
        </div>
        <div>
          <p className="font-brand mb-1 text-[15px] text-white">Appelez pour réserver</p>
          <p className="mb-4 text-sm">Appel ou WhatsApp, du lundi au samedi.</p>
          <PhoneLines lines={lines} tone="dark" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="wrap py-5 text-[11px] uppercase tracking-[0.12em] text-neutral-500">© {new Date().getFullYear()} Luxus Asaad · Dakar</p>
      </div>
    </footer>
  );
}
