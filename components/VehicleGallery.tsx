"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const PHOTOS = [
  { src: "/vehicule/t03-profil.jpg", w: 1600, h: 800, label: "Profil", alt: "Leapmotor T03 bleu nuit vue de profil" },
  { src: "/vehicule/t03-avant.jpg", w: 1536, h: 1024, label: "Avant", alt: "Leapmotor T03 bleu nuit vue de face" },
  { src: "/vehicule/t03-arriere.jpg", w: 1536, h: 1024, label: "Arrière", alt: "Leapmotor T03 bleu nuit vue de l'arrière" },
];

/** Galerie du véhicule : on fait glisser au doigt ou on touche Profil / Avant / Arrière. */
export default function VehicleGallery() {
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Onglet actif = photo la plus visible dans la bande
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("[data-i]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    const el = strip.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={strip}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carrousel"
        aria-label="Photos du véhicule"
      >
        {PHOTOS.map((p, i) => (
          <div key={p.src} data-i={i} className="flex aspect-[3/2] w-full shrink-0 snap-center sm:aspect-[2/1] items-center justify-center px-2" aria-label={`${i + 1} sur ${PHOTOS.length}`}>
            <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(max-width: 1024px) 100vw, 1000px"
              className="h-full w-full object-contain" priority={false} />
          </div>
        ))}
      </div>
      <div className="cells mx-auto mt-3 max-w-sm grid-cols-3" role="tablist" aria-label="Choisir une vue">
        {PHOTOS.map((p, i) => (
          <button key={p.src} type="button" role="tab" aria-selected={active === i} onClick={() => go(i)}
            className={`chip text-[12px] font-semibold uppercase tracking-[0.06em] ${active === i ? "chip-on" : "chip-off"}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
