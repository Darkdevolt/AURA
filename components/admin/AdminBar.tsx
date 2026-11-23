"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const NAV = [
  { href: "/admin", label: "Réservations" },
  { href: "/admin/journees", label: "Journées" },
  { href: "/admin/finances", label: "Finances" },
  { href: "/admin/depenses", label: "Dépenses" },
  { href: "/admin/flotte", label: "Flotte" },
  { href: "/admin/rapport", label: "Rapport" },
  { href: "/admin/plages", label: "Plages" },
  { href: "/admin/reglages", label: "Réglages" },
];

/** Barre d'administration : compacte, toujours visible, onglet actif en or. */
export default function AdminBar({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const path = usePathname();
  const active = NAV.find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)))?.href;
  const tabs = useRef<HTMLDivElement>(null);

  // L'onglet actif reste visible dans la barre défilante
  useEffect(() => {
    tabs.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div className="sticky top-0 z-[1000] bg-ink text-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6">
        <Link href="/admin" className="flex min-h-10 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-light.png" alt="" width={30} height={25} />
          <span className="font-brand text-[13px] leading-none">Luxus <span className="gold-text">Asaad</span> <span className="ml-1 text-[10px] tracking-[0.12em] text-neutral-400">Admin</span></span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="inline-flex min-h-10 items-center px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-400">Site</Link>
          <form action={signOut}>
            <button title={email} aria-label="Se déconnecter" className="inline-flex h-10 w-10 items-center justify-center text-neutral-400 active:text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Administration" className="mx-auto max-w-6xl">
        <div ref={tabs} className="flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => {
            const on = n.href === active;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={`relative inline-flex min-h-11 shrink-0 items-center text-[11px] font-semibold uppercase tracking-[0.06em] ${on ? "text-white" : "text-neutral-400"}`}>
                {n.label}
                {on && <span aria-hidden className="gold-rule absolute inset-x-0 bottom-0" />}
              </Link>
            );
          })}
        </div>
      </nav>
      <div aria-hidden className="h-px bg-white/10" />
    </div>
  );
}
