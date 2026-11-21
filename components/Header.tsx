import Link from "next/link";
import Logo from "./Logo";
import NavLinks from "./NavLinks";
import { PhoneIcon } from "./PhoneLines";
import type { ContactLine } from "@/lib/types";

export default function Header({ line }: { line?: ContactLine }) {
  return (
    <header className="sticky top-0 z-[1000] bg-ink text-white print:hidden">
      <div className="wrap flex items-center justify-between gap-3 pt-3">
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Luxus Asaad — accueil">
          <Logo height={32} />
          <span className="font-brand whitespace-nowrap text-[14px] leading-none min-[400px]:text-[16px]">
            Luxus <span className="gold-text">Asaad</span>
          </span>
        </Link>
        {line && (
          <a href={`tel:${line.phone}`} aria-label={`Appeler le ${line.phone}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 bg-gold-grad px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-ink min-[400px]:px-4">
            <PhoneIcon className="h-4 w-4" /> <span className="max-[359px]:sr-only">Appeler</span>
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
