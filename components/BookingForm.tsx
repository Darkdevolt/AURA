"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddressSearch from "./AddressSearch";
import type { PointKind } from "./MapPicker";
import { isInSenegal } from "@/lib/geo";
import { reverseGeocode } from "@/lib/nominatim";
import { formatSenegalPhone, normalizeSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { bookableDates } from "@/lib/slots";
import { dakarDate, dakarTime, formatDateLong, formatDateShort } from "@/lib/time";
import type { LatLng, Place } from "@/lib/types";
import type { PublicSettings } from "@/lib/server-data";
import { bookingWhatsAppMessage, waLink, type BookingSummary } from "@/lib/whatsapp";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border border-line bg-neutral-100 text-sm text-neutral-600 sm:h-80">
      Chargement de la carte…
    </div>
  ),
});

interface Estimate {
  distanceKm: number;
  durationMin: number;
  price: number;
  airport: boolean;
  source: "osrm" | "fallback";
}

interface SlotOption {
  start: string;
  time: string;
}

type Confirmation = BookingSummary & { distance_km: number; duration_min: number; whatsapp_number: string };

const DEFAULT_DURATION = 25;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-3 flex items-center gap-2.5 text-lg font-bold">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm text-gold-light">{n}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function BookingForm({ settings }: { settings: PublicSettings }) {
  const [pickup, setPickup] = useState<Place | null>(null);
  const [pickupNote, setPickupNote] = useState("");
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [active, setActive] = useState<PointKind>("pickup");
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

  // ---------------------------------------------------------------- Points
  const setPoint = useCallback(async (kind: PointKind, p: LatLng, address?: string) => {
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
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil. Recherchez votre adresse ou touchez la carte.");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        setActive("dropoff");
        void setPoint("pickup", { lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGeoState("error");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Vous avez refusé l'accès à votre position. Recherchez votre adresse ou touchez la carte pour placer le repère."
            : err.code === err.TIMEOUT
              ? "La position met trop de temps à arriver. Réessayez ou recherchez votre adresse."
              : "Position introuvable. Recherchez votre adresse ou touchez la carte.",
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
      setConfirmation(data);
      try {
        localStorage.setItem("la:last", JSON.stringify({ reference: data.reference, phone: data.customer_phone }));
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
        <div className="card border-gold/60 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-dark">Réservation enregistrée</p>
          <p className="mt-2 text-4xl font-extrabold tracking-wide">{confirmation.reference}</p>
          <p className="mt-3 text-[15px] text-neutral-700">
            Merci {confirmation.customer_name} ! Votre demande est <strong>en attente de confirmation</strong>.
            Envoyez-la-nous sur WhatsApp pour une confirmation plus rapide.
          </p>
          <a
            className="btn-whatsapp mt-4 w-full"
            href={waLink(confirmation.whatsapp_number, bookingWhatsAppMessage(confirmation))}
            target="_blank"
            rel="noopener noreferrer"
          >
            Envoyer sur WhatsApp
          </a>
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Step n={1} title="Départ et destination">
        <button type="button" className="btn-gold w-full" onClick={useMyPosition} disabled={geoState === "loading"}>
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          {geoState === "loading" ? "Localisation en cours…" : "Utiliser ma position"}
        </button>
        {geoError && <p className="alert-info" role="alert">{geoError}</p>}

        <AddressSearch
          label="Point de départ"
          placeholder="Quartier, rue, lieu connu…"
          value={pickup}
          onSelect={(p) => {
            void setPoint("pickup", p, p.address);
            setActive("dropoff");
          }}
        />
        <div>
          <label htmlFor="pickup-note" className="label">Repère / indications <span className="font-normal text-neutral-600">(facultatif)</span></label>
          <input id="pickup-note" className="input" maxLength={300} placeholder="Ex. devant la pharmacie, portail bleu" value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} />
        </div>
        <AddressSearch
          label="Destination"
          placeholder="Où allez-vous ?"
          value={dropoff}
          onSelect={(p) => void setPoint("dropoff", p, p.address)}
        />

        <div>
          <div className="mb-2 flex gap-2" role="group" aria-label="Point à placer sur la carte">
            {(["pickup", "dropoff"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={active === k}
                onClick={() => setActive(k)}
                className={`chip flex-1 ${active === k ? "border-ink bg-ink text-white" : "border-neutral-300 bg-white"}`}
              >
                {k === "pickup" ? "A · Placer le départ" : "B · Placer la destination"}
              </button>
            ))}
          </div>
          <MapPicker pickup={pickup} dropoff={dropoff} active={active} onPick={(k, p) => void setPoint(k, p)} />
          <p className="mt-1.5 text-sm text-neutral-600">Touchez la carte pour placer le repère sélectionné, ou faites glisser les repères A et B.</p>
        </div>

        {(estimateLoading || estimate || estimateError) && (
          <div className="rounded-xl bg-ink p-4 text-white" aria-live="polite">
            {estimateLoading && <p>Calcul de l&apos;estimation…</p>}
            {!estimateLoading && estimateError && <p className="text-rose-200">{estimateError}</p>}
            {!estimateLoading && estimate && (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-xs uppercase text-neutral-300">Distance</p><p className="text-lg font-bold">{estimate.distanceKm.toLocaleString("fr-FR")} km</p></div>
                  <div><p className="text-xs uppercase text-neutral-300">Durée</p><p className="text-lg font-bold">~{estimate.durationMin} min</p></div>
                  <div><p className="text-xs uppercase text-neutral-300">Prix estimé</p><p className="text-lg font-bold text-gold-light">{formatFcfa(estimate.price)}</p></div>
                </div>
                <p className="mt-2 text-center text-sm text-neutral-300">
                  {estimate.airport ? "Tarif fixe Aéroport AIBD. " : ""}Prix indicatif, payé à la fin de la course.
                  {estimate.source === "fallback" ? " (Estimation approximative.)" : ""}
                </p>
              </>
            )}
          </div>
        )}
      </Step>

      <Step n={2} title="Date et heure">
        <div>
          <p className="label" id="date-label">Jour</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-labelledby="date-label">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={date === d}
                onClick={() => setDate(d)}
                className={`chip shrink-0 capitalize ${date === d ? "border-ink bg-ink text-white" : "border-neutral-300 bg-white"}`}
              >
                {d === dakarDate(Date.now()) ? "Aujourd'hui" : formatDateShort(d)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-neutral-600">Du lundi au samedi, de 8h00 à 20h00. Réservation au moins 1 h à l&apos;avance.</p>
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
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-labelledby="slot-label">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    role="radio"
                    aria-checked={slot === s.start}
                    onClick={() => setSlot(s.start)}
                    className={`chip ${slot === s.start ? "border-ink bg-ink text-white" : "border-neutral-300 bg-white"}`}
                  >
                    {s.time.replace(":", "h")}
                  </button>
                ))}
              </div>
            )}
            {!estimate && <p className="mt-2 text-sm text-neutral-600">Indiquez le départ et la destination pour des créneaux plus précis.</p>}
          </div>
        )}
      </Step>

      <Step n={3} title="Passagers et commentaire">
        <div>
          <p className="label" id="pax-label">Nombre de passagers</p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="pax-label">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={passengers === n} onClick={() => setPassengers(n)}
                className={`chip ${passengers === n ? "border-ink bg-ink text-white" : "border-neutral-300 bg-white"}`}>
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

      <div className="card space-y-3">
        {estimate && (
          <p className="flex items-baseline justify-between text-[15px]">
            <span>Prix estimé</span>
            <strong className="text-xl">{formatFcfa(estimate.price)}</strong>
          </p>
        )}
        {submitError && <p className="alert-error" role="alert">{submitError}</p>}
        <button type="submit" className="btn-primary w-full text-lg" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Confirmer la réservation"}
        </button>
        <p className="text-center text-sm text-neutral-600">
          Aucun paiement en ligne. Vous payez à la fin de la course en espèces, Wave ou Orange Money.
        </p>
      </div>
    </form>
  );
}
