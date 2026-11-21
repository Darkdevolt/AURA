import Link from "next/link";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import { PhoneIcon } from "./PhoneLines";
import type { ContactLine } from "@/lib/types";

export default function Header({ line }: { line?: ContactLine }) {
  return (
    <header className="sticky top-0 z-[1000] border-b border-white/10 bg-ink text-white">
      <div className="wrap flex items-center justify-between gap-3 py-2.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Luxus Asaad — accueil">
          <Logo height={38} />
          <span className="text-[17px] font-extrabold uppercase leading-none tracking-[0.08em]">
            Luxus <span className="gold-text">Asaad</span>
          </span>
        </Link>
        {line && (
          <a href={`tel:${line.phone}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-b from-gold-light to-gold px-4 text-sm font-semibold text-ink">
            <PhoneIcon className="h-4 w-4" /> Appeler
          </a>
        )}
      </div>
      <nav aria-label="Navigation principale" className="wrap overflow-x-auto pb-2 !px-2">
        <NavLinks />
      </nav>
    </header>
  );
}
