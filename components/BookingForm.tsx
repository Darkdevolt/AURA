"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AddressSearch from "./AddressSearch";
import { WhatsAppIcon } from "./PhoneLines";
import LocationPicker, { type PickKind } from "./map/LocationPicker";
import { isInSenegal } from "@/lib/geo";
import { reverseGeocode } from "@/lib/nominatim";
import { formatSenegalPhone, normalizeSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { bookableDates } from "@/lib/slots";
import { dakarDate, dakarTime, formatDateLong, formatDateShort } from "@/lib/time";
import type { LatLng, Place } from "@/lib/types";
import type { PublicSettings } from "@/lib/server-data";
import { bookingWhatsAppMessage, waLink, type BookingSummary } from "@/lib/whatsapp";

const RouteMap = dynamic(() => import("./map/RouteMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-sm text-neutral-500">Chargement de la carte…</div>,
});

function MapPinButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="absolute right-0 top-0 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-gold-dark hover:text-ink">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
      Sur la carte
    </button>
  );
}

interface Estimate {
  distanceKm: number;
  durationMin: number;
  price: number;
  airport: boolean;
  source: "osrm" | "fallback";
  geometry?: [number, number][];
}

interface SlotOption {
  start: string;
  time: string;
}

type Confirmation = BookingSummary & { distance_km: number; duration_min: number; whatsapp_number: string; tracking_token: string };

const DEFAULT_DURATION = 25;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8" aria-labelledby={`step-${n}`}>
      <div className="mb-6 flex items-baseline gap-4">
        <span className="font-brand gold-text text-2xl">{String(n).padStart(2, "0")}</span>
        <h3 id={`step-${n}`} className="font-brand text-[15px] tracking-[0.06em]">{title}</h3>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default function BookingForm({ settings }: { settings: PublicSettings }) {
  const [pickup, setPickup] = useState<Place | null>(null);
  const [pickupNote, setPickupNote] = useState("");
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [picking, setPicking] = useState<PickKind | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [geoError, setGeoError] = useState("");

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState("");

  const dates = useMemo(() => bookableDates(Date.now(), { ...settings }), [settings]);
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [slot, setSlot] = useState<string>("");

  const [passengers, setPassengers] = useState(1);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // pot de miel
  const [touchedPhone, setTouchedPhone] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const phoneOk = normalizeSenegalPhone(phone) !== null;

  // Pré-remplissage : « Réserver à nouveau » depuis l'historique, et coordonnées déjà saisies
  useEffect(() => {
    try {
      const client = JSON.parse(localStorage.getItem("la:client") || "null");
      if (client?.name) setName(client.name);
      if (client?.phone) setPhone(formatSenegalPhone(client.phone));
      const pre = JSON.parse(localStorage.getItem("la:prefill") || "null");
      if (pre?.pickup && pre?.dropoff) {
        setPickup(pre.pickup);
        setDropoff(pre.dropoff);
        if (pre.pickupNote) setPickupNote(pre.pickupNote);
        if (pre.passengers) setPassengers(pre.passengers);
        localStorage.removeItem("la:prefill");
      }
    } catch {
      /* stockage indisponible */
    }
  }, []);

  // ---------------------------------------------------------------- Points
  const setPoint = useCallback(async (kind: PickKind, p: LatLng, address?: string) => {
    if (!isInSenegal(p)) {
      setGeoError("Ce point est en dehors du Sénégal.");
      return;
    }
    const place: Place = { ...p, address: address ?? "Recherche de l'adresse…" };
    if (kind === "pickup") setPickup(place);
    else setDropoff(place);
    if (!address) {
      const label = await reverseGeocode(p);
      const update = (prev: Place | null) => (prev && prev.lat === p.lat && prev.lng === p.lng ? { ...prev, address: label } : prev);
      if (kind === "pickup") setPickup(update);
      else setDropoff(update);
    }
  }, []);

  const useMyPosition = () => {
    setGeoError("");
    if (!("geolocation" in navigator)) {
      setGeoState("error");
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil. Recherchez votre adresse ou placez-la sur la carte.");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        void setPoint("pickup", { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGeoState("error");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Vous avez refusé l'accès à votre position. Recherchez votre adresse ou placez-vous sur la carte."
            : err.code === err.TIMEOUT
              ? "La position met trop de temps à arriver. Réessayez ou recherchez votre adresse."
              : "Position introuvable. Recherchez votre adresse ou placez-vous sur la carte.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  // ---------------------------------------------------------------- Estimation
  useEffect(() => {
    if (!pickup || !dropoff) {
      setEstimate(null);
      return;
    }
    const c = new AbortController();
    setEstimateLoading(true);
    setEstimateError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/estimate?from=${pickup.lat},${pickup.lng}&to=${dropoff.lat},${dropoff.lng}`,
          { signal: c.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Estimation impossible.");
        setEstimate(data);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setEstimate(null);
        setEstimateError(navigator.onLine ? (e as Error).message : "Pas de connexion internet.");
      } finally {
        if (!c.signal.aborted) setEstimateLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- Créneaux
  const duration = estimate?.durationMin ?? DEFAULT_DURATION;
  const loadSlots = useCallback(async () => {
    if (!date) return;
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const res = await fetch(`/api/slots?date=${date}&duration=${duration}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots);
      setSlot((cur) => (data.slots.some((s: SlotOption) => s.start === cur) ? cur : ""));
    } catch (e) {
      setSlots(null);
      setSlotsError(navigator.onLine ? (e as Error).message || "Créneaux indisponibles." : "Pas de connexion internet.");
    } finally {
      setSlotsLoading(false);
    }
  }, [date, duration]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // ---------------------------------------------------------------- Envoi
  const missing: string[] = [];
  if (!pickup) missing.push("le point de départ");
  if (!dropoff) missing.push("la destination");
  if (!slot) missing.push("la date et l'heure");
  if (name.trim().length < 2) missing.push("votre prénom");
  if (!phoneOk) missing.push("un numéro de téléphone valide");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missing.length || !pickup || !dropoff) {
      setTouchedPhone(true);
      setSubmitError(`Il manque : ${missing.join(", ")}.`);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          pickup: { lat: pickup.lat, lng: pickup.lng },
          pickup_address: pickup.address,
          pickup_note: pickupNote,
          dropoff: { lat: dropoff.lat, lng: dropoff.lng },
          dropoff_address: dropoff.address,
          start_at: slot,
          passengers,
          comment,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || "La réservation n'a pas pu être enregistrée.");
        if (res.status === 409) void loadSlots();
        return;
      }
      setConfirmation({ ...data, tracking_url: `${window.location.origin}/suivi/${data.reference}?k=${data.tracking_token}` });
      try {
        localStorage.setItem("la:last", JSON.stringify({ reference: data.reference, phone: data.customer_phone }));
        localStorage.setItem("la:client", JSON.stringify({ name, phone: data.customer_phone }));
      } catch {
        /* stockage indisponible : sans importance */
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(
        navigator.onLine
          ? "Le serveur ne répond pas. Réessayez dans un instant."
          : "Pas de connexion internet. Vérifiez votre réseau puis réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- Confirmation
  if (confirmation) {
    const start = Date.parse(confirmation.start_at);
    return (
      <div className="space-y-4">
        <div className="border border-line text-center">
          <div className="relative bg-ink-grad px-5 py-8 text-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center bg-gold-grad text-ink">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-6 w-6"><path d="m5 12 5 5L20 7" /></svg>
            </div>
            <p className="mt-3 eyebrow !text-gold-light">Réservation enregistrée</p>
            <p className="font-brand gold-text mt-2 text-4xl">{confirmation.reference}</p>
          </div>
          <div aria-hidden className="gold-rule" />
          <div className="p-5 text-left">
            <p className="eyebrow">Dernière étape</p>
            <p className="font-brand mt-2 text-lg">Envoyez votre réservation sur WhatsApp</p>
            <p className="mt-2 text-[15px] text-neutral-700">
              Merci {confirmation.customer_name} ! WhatsApp va s&apos;ouvrir avec le message déjà rempli :
              appuyez simplement sur <strong>Envoyer</strong>. Nous vous confirmons la course très vite.
            </p>
            <a
              className="btn-whatsapp mt-4 w-full "
              href={waLink(confirmation.whatsapp_number, bookingWhatsAppMessage(confirmation))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="h-6 w-6" /> Envoyer sur WhatsApp
            </a>
            <p className="mt-2 text-center text-xs text-neutral-500">Envoyé au {formatSenegalPhone(confirmation.whatsapp_number)}</p>
            {confirmation.tracking_url && (
              <a href={confirmation.tracking_url} className="btn-outline mt-3 w-full text-[12px]">Suivre mon chauffeur</a>
            )}
          </div>
        </div>
        <div className="card">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-neutral-600">Date</dt>
            <dd className="font-semibold">{formatDateLong(start)} à {dakarTime(start).replace(":", "h")}</dd>
            <dt className="text-neutral-600">Départ</dt>
            <dd>
              {confirmation.pickup_address}
              {confirmation.pickup_note && <span className="block text-neutral-600">{confirmation.pickup_note}</span>}
            </dd>
            <dt className="text-neutral-600">Destination</dt>
            <dd>{confirmation.dropoff_address}</dd>
            <dt className="text-neutral-600">Passagers</dt>
            <dd>{confirmation.passengers}</dd>
            <dt className="text-neutral-600">Téléphone</dt>
            <dd>{formatSenegalPhone(confirmation.customer_phone)}</dd>
            <dt className="text-neutral-600">Prix estimé</dt>
            <dd className="font-semibold">{formatFcfa(confirmation.estimated_price)}</dd>
          </dl>
          <p className="mt-3 text-sm text-neutral-600">Prix indicatif, payé à la fin de la course (espèces, Wave ou Orange Money).</p>
        </div>
        <p className="text-center text-[15px]">
          Conservez votre numéro <strong>{confirmation.reference}</strong> : il permet de{" "}
          <Link href={`/ma-reservation?ref=${confirmation.reference}`} className="font-semibold underline underline-offset-2">
            consulter ou annuler votre réservation
          </Link>
          .
        </p>
        <button type="button" className="btn-outline w-full" onClick={() => window.location.reload()}>
          Nouvelle réservation
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- Formulaire
  return (
    <form onSubmit={submit} noValidate>
      <Step n={1} title="Votre trajet">
        <div className="relative space-y-4 pl-9">
          <div aria-hidden className="absolute bottom-10 left-[13px] top-10 w-px bg-gradient-to-b from-ink via-neutral-300 to-gold" />
          <div className="relative">
            <span aria-hidden className="absolute -left-9 top-9 flex h-7 w-7 items-center justify-center bg-ink text-xs font-bold text-gold-light">A</span>
            <MapPinButton onClick={() => setPicking("pickup")} label="Placer le point de départ sur la carte" />
            <AddressSearch
              label="Point de départ"
              placeholder="Quartier, rue, lieu connu…"
              value={pickup}
              onSelect={(p) => void setPoint("pickup", p, p.address)}
              onMapRequest={() => setPicking("pickup")}
            />
            <button type="button" onClick={useMyPosition} disabled={geoState === "loading"}
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.05em] text-gold-dark hover:text-ink disabled:opacity-60">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
              {geoState === "loading" ? "Localisation en cours…" : "Utiliser ma position actuelle"}
            </button>
            {geoError && <p className="alert-info mt-1" role="alert">{geoError}</p>}
            <div className="mt-2">
              <label htmlFor="pickup-note" className="label">Repère / indications <span className="font-normal normal-case tracking-normal text-neutral-500">(facultatif)</span></label>
              <input id="pickup-note" className="input" maxLength={300} placeholder="Ex. devant la pharmacie, portail bleu" value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} />
            </div>
          </div>
          <div className="relative">
            <span aria-hidden className="absolute -left-9 top-9 flex h-7 w-7 items-center justify-center bg-gold-grad text-xs font-bold text-ink">B</span>
            <MapPinButton onClick={() => setPicking("dropoff")} label="Placer la destination sur la carte" />
            <AddressSearch
              label="Destination"
              placeholder="Où allez-vous ?"
              value={dropoff}
              onSelect={(p) => void setPoint("dropoff", p, p.address)}
              onMapRequest={() => setPicking("dropoff")}
            />
          </div>
        </div>

        {/* Aperçu du trajet */}
        <div className="border border-line">
          <div className="relative isolate h-56 overflow-hidden bg-neutral-100 sm:h-64">
            {pickup || dropoff ? (
              <RouteMap pickup={pickup} dropoff={dropoff} route={estimate?.geometry ?? null} onPick={setPicking} />
            ) : (
              <button type="button" onClick={() => setPicking("pickup")}
                className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-grad text-white">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="#e5b33a" aria-hidden><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
                <span className="font-brand text-[14px]">Placer mon départ sur la carte</span>
                <span className="max-w-xs px-6 text-center text-xs text-neutral-400">Pas d&apos;adresse précise ? Faites glisser la carte jusqu&apos;à l&apos;endroit exact où vous êtes.</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
            {(["pickup", "dropoff"] as const).map((k) => {
              const set = k === "pickup" ? pickup : dropoff;
              return (
                <button key={k} type="button" onClick={() => setPicking(k)}
                  className="flex min-h-12 items-center justify-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.05em] hover:bg-neutral-50">
                  <span className={`flex h-5 w-5 items-center justify-center text-[10px] font-bold ${k === "pickup" ? "bg-ink text-gold-light" : "bg-gold-grad text-ink"}`}>{k === "pickup" ? "A" : "B"}</span>
                  {set ? (k === "pickup" ? "Ajuster le départ" : "Ajuster l'arrivée") : k === "pickup" ? "Je suis ici" : "Je vais ici"}
                </button>
              );
            })}
          </div>
        </div>

        {(estimateLoading || estimate || estimateError) && (
          <div className="relative bg-ink-grad p-5 text-white" aria-live="polite">
            <div aria-hidden className="gold-rule absolute inset-x-0 top-0" />
            {estimateLoading && <p>Calcul de l&apos;estimation…</p>}
            {!estimateLoading && estimateError && <p className="text-rose-200">{estimateError}</p>}
            {!estimateLoading && estimate && (
              <>
                <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Distance</p><p className="text-lg font-bold">{estimate.distanceKm.toLocaleString("fr-FR")} km</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Durée</p><p className="text-lg font-bold">~{estimate.durationMin} min</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Prix estimé</p><p className="text-lg font-bold gold-text">{formatFcfa(estimate.price)}</p></div>
                </div>
                <p className="mt-4 text-center text-xs text-neutral-400">
                  {estimate.airport ? "Tarif fixe Aéroport AIBD. " : ""}Prix indicatif, payé à la fin de la course.
                  {estimate.source === "fallback" ? " (Estimation approximative.)" : ""}
                </p>
              </>
            )}
          </div>
        )}
      </Step>

      {picking &&
        createPortal(
          <LocationPicker
            key={picking}
            kind={picking}
            value={picking === "pickup" ? pickup : dropoff}
            other={picking === "pickup" ? dropoff : pickup}
            note={pickupNote}
            onClose={() => setPicking(null)}
            onConfirm={(place, note) => {
              if (picking === "pickup") {
                setPickup(place);
                if (note !== undefined) setPickupNote(note);
                setPicking(dropoff ? null : "dropoff");
              } else {
                setDropoff(place);
                setPicking(null);
              }
            }}
          />,
          document.body,
        )}

      <Step n={2} title="Date et heure">
        <div>
          <p className="label" id="date-label">Jour</p>
          <div className="flex snap-x divide-x divide-line overflow-x-auto border border-line" role="radiogroup" aria-labelledby="date-label">
            {dates.map((d) => {
              const [wd, day, month] = formatDateShort(d).replace(/\./g, "").split(" ");
              const today = d === dakarDate(Date.now());
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={date === d}
                  aria-label={today ? "Aujourd'hui" : formatDateShort(d)}
                  onClick={() => setDate(d)}
                  className={`flex w-[4.5rem] shrink-0 snap-start flex-col items-center py-2.5 transition ${date === d ? "chip-on" : "chip-off"}`}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${date === d ? "text-gold-light" : "text-neutral-500"}`}>{today ? "Auj." : wd}</span>
                  <span className="text-xl font-bold leading-tight">{day}</span>
                  <span className={`text-[11px] ${date === d ? "text-neutral-300" : "text-neutral-500"}`}>{month}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Du lundi au samedi, de 8h00 à 20h00 · au moins 1 h à l&apos;avance.</p>
        </div>
        {date && (
          <div>
            <p className="label" id="slot-label">Heure de prise en charge</p>
            {slotsLoading && <p className="text-[15px] text-neutral-600">Chargement des créneaux…</p>}
            {slotsError && (
              <div className="alert-error" role="alert">
                {slotsError}{" "}
                <button type="button" className="font-semibold underline" onClick={() => void loadSlots()}>Réessayer</button>
              </div>
            )}
            {!slotsLoading && slots && slots.length === 0 && (
              <p className="alert-info">Plus aucun créneau libre ce jour-là. Choisissez un autre jour.</p>
            )}
            {!slotsLoading && slots && slots.length > 0 && (
              <div className="space-y-3" role="radiogroup" aria-labelledby="slot-label">
                {[
                  ["Matin", (t: string) => t < "12:00"],
                  ["Après-midi", (t: string) => t >= "12:00" && t < "17:00"],
                  ["Soir", (t: string) => t >= "17:00"],
                ].map(([label, test]) => {
                  const group = slots.filter((s) => (test as (t: string) => boolean)(s.time));
                  if (!group.length) return null;
                  return (
                    <div key={label as string}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label as string}</p>
                      <div className="cells grid-cols-4 sm:grid-cols-6">
                        {group.map((s) => (
                          <button
                            key={s.start}
                            type="button"
                            role="radio"
                            aria-checked={slot === s.start}
                            onClick={() => setSlot(s.start)}
                            className={`chip tabular-nums ${slot === s.start ? "chip-on" : "chip-off"}`}
                          >
                            {s.time.replace(":", "h")}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!estimate && <p className="mt-2 text-sm text-neutral-600">Indiquez le départ et la destination pour des créneaux plus précis.</p>}
          </div>
        )}
      </Step>

      <Step n={3} title="Passagers">
        <div>
          <p className="label" id="pax-label">Nombre de passagers</p>
          <div className="cells grid-cols-4" role="radiogroup" aria-labelledby="pax-label">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={passengers === n} onClick={() => setPassengers(n)}
                className={`chip ${passengers === n ? "chip-on" : "chip-off"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="comment" className="label">Commentaire <span className="font-normal text-neutral-600">(facultatif)</span></label>
          <textarea id="comment" className="input min-h-20" maxLength={500} placeholder="Bagages, siège enfant, arrêt en route…" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </Step>

      <Step n={4} title="Vos coordonnées">
        <div>
          <label htmlFor="name" className="label">Prénom</label>
          <input id="name" className="input" autoComplete="given-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="phone" className="label">Téléphone (WhatsApp de préférence)</label>
          <input
            id="phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+221 77 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => {
              setTouchedPhone(true);
              const n = normalizeSenegalPhone(phone);
              if (n) setPhone(formatSenegalPhone(n));
            }}
            aria-invalid={touchedPhone && !phoneOk}
            aria-describedby="phone-help"
            required
          />
          <p id="phone-help" className={`mt-1 text-sm ${touchedPhone && !phoneOk ? "font-semibold text-rose-800" : "text-neutral-600"}`}>
            {touchedPhone && !phoneOk ? "Numéro invalide. Format attendu : +221 7X XXX XX XX" : "Numéro sénégalais : +221 7X XXX XX XX"}
          </p>
        </div>
        {/* Pot de miel : invisible pour les humains */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Site web</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
      </Step>

      {submitError && <p className="alert-error mt-2" role="alert">{submitError}</p>}
      <p className="mt-4 border-t border-line pt-6 text-center text-sm text-neutral-500">
        Aucun paiement en ligne : vous payez à la fin de la course, en espèces, Wave ou Orange Money.
      </p>

      {/* Barre de confirmation fixe en bas de l'écran */}
      <div className="sticky bottom-0 z-[900] -mx-5 mt-6 bg-ink text-white sm:mx-0">
        <div aria-hidden className="gold-rule" />
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">{estimate ? "Prix estimé" : "Prix"}</p>
            <p className="truncate text-lg font-semibold tabular-nums">
              {estimate ? <span className="gold-text">{formatFcfa(estimate.price)}</span> : <span className="text-sm font-normal text-neutral-400">Indiquez votre trajet</span>}
            </p>
          </div>
          <button type="submit" className="btn-gold shrink-0 px-5" disabled={submitting}>
            {submitting ? "Envoi…" : "Confirmer"}
          </button>
        </div>
      </div>
    </form>
  );
}
