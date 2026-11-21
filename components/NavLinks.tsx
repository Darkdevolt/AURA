"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Réserver" },
  { href: "/ma-reservation", label: "Ma réservation" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex justify-between gap-2 whitespace-nowrap text-[10px] max-[359px]:text-[8.5px] min-[400px]:text-[11px] sm:justify-start font-semibold uppercase tracking-[0.05em] sm:gap-6 sm:text-[12px] sm:tracking-[0.07em]">
      {NAV.map((n) => {
        const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`relative inline-flex min-h-11 items-center transition ${on ? "text-white" : "text-neutral-400 hover:text-white"}`}
            >
              {n.label}
              {on && <span aria-hidden className="gold-rule absolute inset-x-0 bottom-1.5" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
