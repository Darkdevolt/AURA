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
    <ul className="flex gap-1 whitespace-nowrap text-[15px]">
      {NAV.map((n) => {
        const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-3 text-[14.5px] transition ${
                on ? "bg-white/10 font-semibold text-gold-light" : "text-neutral-300 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
