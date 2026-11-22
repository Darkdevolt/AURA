"use client";

import { useEffect, useRef, useState } from "react";
import type { CarViewer } from "@/lib/car3d";

/**
 * Maquette 3D de la Leapmotor T03. La bibliothèque 3D n'est chargée que lorsque le bloc
 * arrive à l'écran, et l'animation s'arrête quand il en sort (batterie et données préservées).
 */
export default function Car3D({ color = "#1f5fb4", plate = "AB-156-LJ", className = "" }: { color?: string; plate?: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let viewer: CarViewer | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (viewer) {
          viewer.setVisible(entry.isIntersecting);
          return;
        }
        if (!entry.isIntersecting || state !== "idle") return;
        setState("loading");
        import("@/lib/car3d")
          .then(({ mountCarViewer }) => {
            if (cancelled) return;
            viewer = mountCarViewer(el, { color, plate });
            setState("ready");
          })
          .catch(() => setState("error"));
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      viewer?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, plate]);

  return (
    <div className={`relative isolate overflow-hidden bg-[radial-gradient(80%_70%_at_50%_45%,#ffffff_0%,#eef0f3_60%,#dfe3e8_100%)] ${className}`}>
      <div ref={box} className="absolute inset-0" aria-label="Maquette 3D de la Leapmotor T03 bleue : faites glisser pour la faire tourner" role="img" />
      {state !== "ready" && (
        <p className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
          {state === "error" ? "Maquette 3D indisponible sur cet appareil" : "Chargement de la maquette 3D…"}
        </p>
      )}
      {state === "ready" && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
          ↔ Faites glisser pour tourner
        </p>
      )}
    </div>
  );
}
