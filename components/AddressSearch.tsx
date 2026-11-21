"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchAddress } from "@/lib/nominatim";
import { matchPopular, POPULAR_PLACES } from "@/lib/places";
import type { Place } from "@/lib/types";

interface Props {
  label: string;
  placeholder: string;
  value: Place | null;
  onSelect: (p: Place) => void;
  /** Ouvre la carte pour placer le point à la main (adresse introuvable). */
  onMapRequest?: () => void;
}

const SUGGESTED = POPULAR_PLACES.slice(0, 5).map(({ lat, lng, address }) => ({ lat, lng, address }));

export default function AddressSearch({ label, placeholder, value, onSelect, onMapRequest }: Props) {
  const id = useId();
  const [q, setQ] = useState(value?.address ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const ctrl = useRef<AbortController | null>(null);
  const typed = useRef(false);

  // Synchronise le champ quand le point change ailleurs (carte, géolocalisation)
  useEffect(() => {
    typed.current = false;
    setQ(value?.address ?? "");
  }, [value?.address]);

  useEffect(() => {
    if (!typed.current) return;
    const query = q.trim();
    // Lieux fréquents : affichés immédiatement, sans attendre le réseau
    const popular = matchPopular(query);
    if (query.length < 2) {
      ctrl.current?.abort();
      setResults(query ? popular : SUGGESTED);
      setStatus("idle");
      return;
    }
    setResults(popular);
    setOpen(true);
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setStatus("loading");
      try {
        const r = await searchAddress(query, c.signal);
        if (c.signal.aborted) return;
        const merged = [...popular, ...r.filter((x) => !popular.some((p) => p.address === x.address))].slice(0, 8);
        setResults(merged);
        setStatus(merged.length ? "idle" : "empty");
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStatus(popular.length ? "idle" : "error");
        setOpen(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        className="input"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          typed.current = true;
          setQ(e.target.value);
        }}
        onFocus={() => {
          // Champ vide : propose tout de suite les lieux les plus demandés
          if (!q.trim()) {
            setResults(SUGGESTED);
            setStatus("idle");
          }
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-expanded={open}
        role="combobox"
      />
      {open && (results.length > 0 || status === "loading" || status === "empty" || status === "error") && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-[1100] mt-1 max-h-[min(18rem,50dvh)] w-full overflow-auto overscroll-contain border border-line bg-white shadow-lg"
        >
          {status === "empty" && (
            <li className="px-4 py-3 text-[15px] text-neutral-700">
              Adresse introuvable. Essayez un quartier ou un lieu connu{onMapRequest ? "," : ", ou placez le repère sur la carte."}
              {onMapRequest && (
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onMapRequest(); }}
                  className="mt-2 block font-semibold text-gold-dark underline underline-offset-4">ou placez-le vous-même sur la carte</button>
              )}
            </li>
          )}
          {status === "error" && (
            <li className="px-4 py-3 text-[15px] text-rose-800">
              Recherche indisponible (connexion ?).
              {onMapRequest && (
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onMapRequest(); }}
                  className="mt-2 block font-semibold text-gold-dark underline underline-offset-4">Placer le point sur la carte</button>
              )}
            </li>
          )}
          {status === "loading" && !results.length && <li className="px-4 py-3 text-[15px] text-neutral-500">Recherche…</li>}
          {!q.trim() && results.length > 0 && (
            <li className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500" aria-hidden>Lieux fréquents</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="block min-h-12 w-full px-4 py-2.5 text-left text-[15px] hover:bg-neutral-50 focus:bg-neutral-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                }}
              >
                {r.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
