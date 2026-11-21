"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Navigation par jour : flèches + calendrier, la page change dès qu'une date est choisie. */
export default function DayNav({ date, prev, next, base = "/admin" }: { date: string; prev: string; next: string; base?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const arrow = "chip chip-off h-12 w-12 border border-line text-lg";
  return (
    <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <Link className={arrow} href={`${base}?date=${prev}`} aria-label="Jour précédent">←</Link>
      <input type="date" value={date} aria-label="Choisir une date" className="input text-center"
        onChange={(e) => e.target.value && start(() => router.push(`${base}?date=${e.target.value}`))} />
      <Link className={arrow} href={`${base}?date=${next}`} aria-label="Jour suivant">→</Link>
    </div>
  );
}
