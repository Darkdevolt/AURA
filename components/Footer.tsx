import Link from "next/link";
import Logo from "./Logo";
import PhoneLines from "./PhoneLines";
import type { ContactLine } from "@/lib/types";

export default function Footer({ lines }: { lines: ContactLine[] }) {
  return (
    <footer className="mt-16 bg-ink text-neutral-300">
      <div className="wrap grid gap-8 py-10 sm:grid-cols-2">
        <div>
          <Logo variant="full" height={110} alt="Luxus Asaad" />
          <p className="mt-3 text-sm leading-relaxed">
            Chauffeur privé en véhicule électrique à Dakar. Du lundi au samedi, de 8h00 à 20h00.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/ma-reservation" className="underline-offset-4 hover:text-white hover:underline">Ma réservation</Link>
            <Link href="/a-propos" className="underline-offset-4 hover:text-white hover:underline">À propos</Link>
            <Link href="/mentions-legales" className="underline-offset-4 hover:text-white hover:underline">Mentions légales</Link>
          </p>
        </div>
        <div>
          <p className="mb-3 font-display text-lg font-semibold text-white">Appelez pour réserver</p>
          <PhoneLines lines={lines} tone="dark" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="wrap py-4 text-xs text-neutral-500">© {new Date().getFullYear()} Luxus Asaad · Dakar, Sénégal</p>
      </div>
    </footer>
  );
}
