"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchAddress } from "@/lib/nominatim";
import type { Place } from "@/lib/types";

interface Props {
  label: string;
  placeholder: string;
  value: Place | null;
  onSelect: (p: Place) => void;
}

export default function AddressSearch({ label, placeholder, value, onSelect }: Props) {
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
    if (query.length < 3) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setStatus("loading");
      try {
        const r = await searchAddress(query, c.signal);
        if (c.signal.aborted) return;
        setResults(r);
        setStatus(r.length ? "idle" : "empty");
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStatus("error");
        setOpen(true);
      }
    }, 700);
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
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-expanded={open}
        role="combobox"
      />
      {status === "loading" && <p className="mt-1 text-sm text-neutral-600">Recherche…</p>}
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-[1100] mt-1 max-h-72 w-full overflow-auto border border-line bg-white shadow-lg"
        >
          {status === "empty" && (
            <li className="px-4 py-3 text-[15px] text-neutral-700">
              Adresse introuvable. Essayez un quartier ou un lieu connu, ou placez le repère sur la carte.
            </li>
          )}
          {status === "error" && (
            <li className="px-4 py-3 text-[15px] text-rose-800">
              Recherche indisponible (connexion ?). Placez le repère directement sur la carte.
            </li>
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
