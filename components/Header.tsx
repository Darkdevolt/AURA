import Link from "next/link";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import { PhoneIcon } from "./PhoneLines";
import type { ContactLine } from "@/lib/types";

export default function Header({ line }: { line?: ContactLine }) {
  return (
    <header className="sticky top-0 z-[1000] bg-ink text-white">
      <div className="wrap flex items-center justify-between gap-3 pt-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Luxus Asaad — accueil">
          <Logo height={36} />
          <span className="font-brand text-[17px] leading-none">
            Luxus <span className="gold-text">Asaad</span>
          </span>
        </Link>
        {line && (
          <a href={`tel:${line.phone}`} aria-label={`Appeler le ${line.phone}`}
            className="inline-flex h-10 items-center gap-2 bg-gold-grad px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            <PhoneIcon className="h-4 w-4" /> Appeler
          </a>
        )}
      </div>
      <nav aria-label="Navigation principale" className="wrap overflow-x-auto">
        <NavLinks />
      </nav>
      <div aria-hidden className="gold-rule opacity-60" />
    </header>
  );
}
