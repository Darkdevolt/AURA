"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import AddressSearch from "../AddressSearch";
import type { FlyTo } from "./PickerMap";
import { DAKAR_CENTER, isInSenegal } from "@/lib/geo";
import type { BaseLayer } from "@/lib/map-ui";
import { reverseGeocode } from "@/lib/nominatim";
import type { LatLng, Place } from "@/lib/types";

const PickerMap = dynamic(() => import("./PickerMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-sm text-neutral-500">Chargement de la carte…</div>,
});

export type PickKind = "pickup" | "dropoff";

interface Props {
  kind: PickKind;
  value: Place | null;
  other: Place | null;
  note?: string;
  onClose: () => void;
  onConfirm: (place: Place, note?: string) => void;
}

/**
 * Sélecteur plein écran : un repère fixe au centre, l'utilisateur fait glisser la carte
 * jusqu'au point exact (« je suis ici » / « je vais ici »), même sans connaître l'adresse.
 */
export default function LocationPicker({ kind, value, other, note: initialNote = "", onClose, onConfirm }: Props) {
  const pickup = kind === "pickup";
  const start = value ?? other ?? DAKAR_CENTER;
  const [center, setCenter] = useState<LatLng>(start);
  const [moving, setMoving] = useState(false);
  const [address, setAddress] = useState(value?.address ?? "");
  const [resolving, setResolving] = useState(false);
  const [layer, setLayer] = useState<BaseLayer>("plan");
  const [flyTo, setFlyTo] = useState<FlyTo | null>(null);
  const [user, setUser] = useState<(LatLng & { accuracy: number }) | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [note, setNote] = useState(initialNote);
  const [showNote, setShowNote] = useState(Boolean(initialNote));
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextLookup = useRef(Boolean(value));

  // Bloque le défilement de la page et ferme avec Échap
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const onMove = useCallback((c: LatLng, isMoving: boolean) => {
    setMoving(isMoving);
    if (isMoving) return;
    setCenter(c);
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    const id = ++seq.current;
    setResolving(true);
    timer.current = setTimeout(async () => {
      const label = await reverseGeocode(c);
      if (id === seq.current) {
        setAddress(label);
        setResolving(false);
      }
    }, 650);
  }, []);

  const locate = useCallback((silent = false) => {
    if (!("geolocation" in navigator)) {
      if (!silent) setGeoMsg("La localisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    setGeoMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!isInSenegal(p)) {
          if (!silent) setGeoMsg("Votre position semble hors du Sénégal.");
          return;
        }
        setUser(p);
        setFlyTo({ lat: p.lat, lng: p.lng, zoom: 18, key: Date.now() });
      },
      (err) => {
        setLocating(false);
        if (!silent)
          setGeoMsg(
            err.code === err.PERMISSION_DENIED
              ? "Localisation refusée : déplacez la carte jusqu'à votre point."
              : "Position introuvable pour le moment : déplacez la carte jusqu'à votre point.",
          );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, []);

  // Départ sans point choisi : se centre automatiquement sur la position si elle est déjà autorisée
  useEffect(() => {
    if (!pickup || value) return;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => p.state === "granted" && locate(true))
      .catch(() => undefined);
  }, [pickup, value, locate]);

  const confirm = () => {
    if (!isInSenegal(center)) {
      setGeoMsg("Ce point est en dehors du Sénégal.");
      return;
    }
    const label = address && !resolving ? address : `Point sur la carte (${center.lat.toFixed(5)}, ${center.lng.toFixed(5)})`;
    onConfirm({ lat: center.lat, lng: center.lng, address: label }, pickup ? note : undefined);
  };

  const otherPin = other ? { lat: other.lat, lng: other.lng, kind: (pickup ? "B" : "A") as "A" | "B" } : null;

  return (
    <div className="fixed inset-0 z-[2000] flex h-dvh flex-col overflow-hidden bg-white" role="dialog" aria-modal="true" aria-label={pickup ? "Choisir le point de départ" : "Choisir la destination"}>
      {/* En-tête */}
      <div className="relative z-[2] shrink-0 bg-ink px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20" aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">{pickup ? "Point de départ" : "Destination"}</p>
            <p className="font-brand truncate text-[15px]">{pickup ? "Où êtes-vous ?" : "Où allez-vous ?"}</p>
          </div>
        </div>
        <div className="mt-3 [&_.label]:sr-only [&_.input]:border-white/20">
          <AddressSearch
            label="Rechercher une adresse"
            placeholder="Rechercher un lieu, un quartier…"
            value={null}
            onSelect={(p) => {
              setAddress(p.address);
              skipNextLookup.current = true;
              setFlyTo({ lat: p.lat, lng: p.lng, zoom: 18, key: Date.now() });
            }}
          />
        </div>
        <div aria-hidden className="gold-rule absolute inset-x-0 bottom-0" />
      </div>

      {/* Carte */}
      <div className="relative isolate min-h-0 flex-1 overflow-hidden">
        <PickerMap initial={start} initialZoom={value ? 18 : other ? 15 : 13} layer={layer} flyTo={flyTo} user={user} other={otherPin} onMove={onMove} />

        {/* Repère fixe au centre (la pointe désigne le point exact) */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
          <div className="la-center-pin" data-moving={moving}>
            <svg width="44" height="56" viewBox="0 0 36 46" aria-hidden className="drop-shadow-lg">
              <path d="M18 44.5S32.5 29.4 32.5 18A14.5 14.5 0 0 0 3.5 18C3.5 29.4 18 44.5 18 44.5z" fill={pickup ? "#0a0a0a" : "#c48a16"} stroke="#fff" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="8.5" fill={pickup ? "#e5b33a" : "#0a0a0a"} />
              <text x="18" y="22" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" fill={pickup ? "#0a0a0a" : "#e5b33a"}>{pickup ? "A" : "B"}</text>
            </svg>
          </div>
          <div className="la-center-shadow mx-auto -mt-1 h-1.5 w-4 rounded-[50%] bg-black/40" />
        </div>

        {/* Boutons flottants */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
          <button type="button" onClick={() => locate(false)} disabled={locating}
            className="flex h-11 w-11 items-center justify-center bg-white shadow-[0_2px_10px_rgb(0_0_0/0.18)] disabled:opacity-60" aria-label="Me localiser" title="Ma position">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={locating ? "#c48a16" : "#0a0a0a"} strokeWidth="2.2" aria-hidden className={locating ? "animate-spin" : ""}>
              <circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
          <button type="button" onClick={() => setLayer((l) => (l === "plan" ? "satellite" : "plan"))}
            className="flex h-11 w-11 flex-col items-center justify-center bg-white text-[8px] font-bold uppercase shadow-[0_2px_10px_rgb(0_0_0/0.18)]"
            aria-label={layer === "plan" ? "Vue satellite" : "Vue plan"} title={layer === "plan" ? "Satellite" : "Plan"}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0a0a0a" strokeWidth="2" aria-hidden><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>
            {layer === "plan" ? "Satell." : "Plan"}
          </button>
        </div>
        {!moving && !geoMsg && (
          <p className="pointer-events-none absolute inset-x-0 top-3 z-[400] mx-auto w-fit max-w-[70%] bg-ink/85 px-3 py-1.5 text-center text-xs text-white">
            Faites glisser la carte pour placer le repère
          </p>
        )}
        {geoMsg && <p className="absolute inset-x-3 top-3 z-[500] mr-14 bg-white px-3 py-2 text-sm text-ink shadow">{geoMsg}</p>}
      </div>

      {/* Panneau de validation */}
      <div className="relative z-[2] shrink-0 border-t border-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_20px_rgb(0_0_0/0.08)]">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold ${pickup ? "bg-ink text-gold-light" : "bg-gold-grad text-ink"}`}>{pickup ? "A" : "B"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{pickup ? "Je suis ici" : "Je vais ici"}</p>
            <p className="truncate text-[15px] font-semibold" aria-live="polite">
              {moving ? "…" : resolving ? "Recherche de l'adresse…" : address || "Déplacez la carte jusqu'au bon endroit"}
            </p>
          </div>
        </div>
        {pickup && !showNote && (
          <button type="button" onClick={() => setShowNote(true)}
            className="mt-1 min-h-10 text-[12px] font-semibold uppercase tracking-[0.05em] text-gold-dark">
            + Ajouter un repère pour le chauffeur
          </button>
        )}
        {pickup && showNote && (
          <div className="mt-2">
            <label htmlFor="picker-note" className="label">Repère pour le chauffeur <span className="font-normal normal-case tracking-normal text-neutral-500">(facultatif)</span></label>
            <input id="picker-note" className="input" maxLength={300} placeholder="Ex. devant la pharmacie, portail bleu" value={note} onChange={(e) => setNote(e.target.value)} autoFocus={!initialNote} />
          </div>
        )}
        <button type="button" onClick={confirm} disabled={moving} className="btn-gold mt-2 w-full">
          {pickup ? "Valider le départ ici" : "Valider la destination ici"}
        </button>
      </div>
    </div>
  );
}
