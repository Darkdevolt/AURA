"use client";

import { useEffect, useRef, useState } from "react";

/**
 * En-tête collant qui s'efface quand on fait défiler vers le bas et revient dès qu'on remonte :
 * sur téléphone, l'écran reste libre pour le formulaire et le clavier.
 */
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (y < 80) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-hidden={hidden}
      className="sticky top-0 z-[1000] bg-ink text-white transition-transform duration-200 will-change-transform data-[hidden=true]:-translate-y-full print:hidden"
    >
      {children}
    </header>
  );
}
