import Link from "next/link";

const NAV = [
  { href: "/", label: "Réserver" },
  { href: "/ma-reservation", label: "Ma réservation" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-[1000] border-b border-ink-soft bg-ink text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Luxus Asaad — accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10" />
          <span className="text-lg font-bold tracking-wide">
            Luxus <span className="text-gold-light">Asaad</span>
          </span>
        </Link>
      </div>
      <nav aria-label="Navigation principale" className="mx-auto max-w-3xl overflow-x-auto px-2 pb-1.5">
        <ul className="flex gap-1 whitespace-nowrap text-[15px]">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="inline-flex min-h-10 items-center rounded-lg px-3 text-neutral-200 hover:bg-white/10 hover:text-white">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
