"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { googleMapsLink, wazeLink } from "@/lib/geo";
import { formatSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { dakarDate, dakarTime, formatDateLong } from "@/lib/time";
import { STATUS_COLORS, STATUS_LABELS, type BookingStatus } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

interface Course {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_note: string | null;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  start_at: string;
  passengers: number;
  comment: string | null;
  distance_km: number;
  duration_min: number;
  estimated_price: number;
  final_price: number | null;
  payment_method: string | null;
  status: BookingStatus;
  mine: boolean;
  service?: string;
  noshow_wait_minutes?: number;
}

function Login({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chauffeur/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, pin }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (e) {
      setError((e as Error).message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label" htmlFor="d-phone">Téléphone</label><input id="d-phone" type="tel" inputMode="tel" autoComplete="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 7X XXX XX XX" /></div>
      <div><label className="label" htmlFor="d-pin">Code</label><input id="d-pin" type="password" inputMode="numeric" autoComplete="current-password" className="input" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
      <p className="text-sm text-neutral-500">Votre code vous est donné par Luxus Asaad.</p>
    </form>
  );
}

function CourseCard({ c, sharing, onShare, onUpdate }: {
  c: Course;
  sharing: boolean;
  onShare: (id: string | null) => void;
  onUpdate: (id: string, status: string, price?: string, pm?: string) => Promise<void>;
}) {
  const [price, setPrice] = useState(c.final_price ? String(c.final_price) : String(c.estimated_price));
  const [pm, setPm] = useState(c.payment_method ?? "cash");
  const [busy, setBusy] = useState(false);
  const start = Date.parse(c.start_at);
  const act = async (status: string, withPay = false) => {
    setBusy(true);
    await onUpdate(c.id, status, withPay ? price : undefined, withPay ? pm : undefined);
    setBusy(false);
  };
  const done = c.status === "completed" || c.status === "no_show";
  const wait = c.noshow_wait_minutes ?? 10;
  const noShowAt = start + wait * 60_000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (done || Date.now() > noShowAt) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [done, noShowAt]);
  const canNoShow = now >= noShowAt;
  const noShowMsg = `Bonjour ${c.customer_name}, votre chauffeur Luxus Asaad vous a attendu ${wait} minutes au point de rendez-vous (${c.pickup_address}) sans parvenir à vous joindre. La course ${c.reference} est annulée. Pour réserver à nouveau, répondez à ce message.`;
  return (
    <article className="border border-line">
      <header className="flex items-center justify-between gap-2 bg-ink px-4 py-3 text-white">
        <p className="font-brand text-lg tabular-nums">{dakarTime(start).replace(":", "h")}</p>
        <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
      </header>
      <div className="space-y-3 p-4 text-[15px]">
        <p className="font-semibold">{c.customer_name} · {c.passengers} pass. <span className="font-normal text-neutral-500">({c.reference})</span></p>
        {c.service && c.service !== "course" && (
          <p className="inline-block bg-gold-grad px-2 py-0.5 text-[11px] font-bold uppercase text-ink">{c.service === "journee" ? "Mise à disposition — journée" : "Mise à disposition — demi-journée"}</p>
        )}
        <div>
          <p><span className="font-semibold text-neutral-500">A</span> {c.pickup_address}</p>
          {c.pickup_note && <p className="ml-4 text-neutral-700">↳ {c.pickup_note}</p>}
          <p><span className="font-semibold text-gold-dark">B</span> {c.dropoff_address}</p>
        </div>
        {c.comment && <p className="border-l-2 border-gold bg-neutral-50 px-3 py-2">{c.comment}</p>}
        <p className="text-sm text-neutral-600">{c.distance_km} km · ~{c.duration_min} min · estimé {formatFcfa(c.estimated_price)}</p>
        <div className="cells grid-cols-4">
          <a className="chip chip-off text-[12px]" href={`tel:${c.customer_phone}`}>Appeler</a>
          <a className="chip chip-off text-[12px]" href={waLink(c.customer_phone, `Bonjour ${c.customer_name}, c'est votre chauffeur Luxus Asaad.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="chip chip-off text-[12px]" href={wazeLink({ lat: c.status === "in_progress" ? c.dropoff_lat : c.pickup_lat, lng: c.status === "in_progress" ? c.dropoff_lng : c.pickup_lng })} target="_blank" rel="noopener noreferrer">Waze</a>
          <a className="chip chip-off text-[12px]" href={googleMapsLink({ lat: c.status === "in_progress" ? c.dropoff_lat : c.pickup_lat, lng: c.status === "in_progress" ? c.dropoff_lng : c.pickup_lng })} target="_blank" rel="noopener noreferrer">Maps</a>
        </div>
        <p className="text-xs text-neutral-500">{formatSenegalPhone(c.customer_phone)}</p>

        {!done && (
          <>
            <button type="button" onClick={() => onShare(sharing ? null : c.id)}
              className={`btn w-full text-[12px] ${sharing ? "bg-emerald-700 text-white" : "btn-outline"}`}>
              {sharing ? "● Position partagée avec le client — arrêter" : "Partager ma position avec le client"}
            </button>
            {c.status === "pending" && <button className="btn-primary w-full" disabled={busy} onClick={() => act("confirmed")}>J&apos;accepte la course</button>}
            {(c.status === "pending" || c.status === "confirmed") && (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-gold" disabled={busy} onClick={() => { onShare(c.id); void act("in_progress"); }}>Client à bord</button>
                <button className="btn-outline" disabled={busy || !canNoShow}
                  title={canNoShow ? undefined : `Possible ${wait} min après l'heure prévue`}
                  onClick={() => { if (confirm(`Le client ne s'est pas présenté après ${wait} min d'attente et ne répond pas ?`)) void act("no_show"); }}>
                  {canNoShow ? "Client absent" : `Absent (dès ${dakarTime(noShowAt).replace(":", "h")})`}
                </button>
              </div>
            )}
            {c.status === "in_progress" && (
              <div className="space-y-3 border-t border-line pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label" htmlFor={`p-${c.id}`}>Prix payé</label><input id={`p-${c.id}`} className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
                  <div><label className="label" htmlFor={`m-${c.id}`}>Paiement</label>
                    <select id={`m-${c.id}`} className="input" value={pm} onChange={(e) => setPm(e.target.value)}>
                      <option value="cash">Espèces</option><option value="wave">Wave</option><option value="orange_money">Orange Money</option>
                    </select></div>
                </div>
                <button className="btn-primary w-full" disabled={busy} onClick={() => { onShare(null); void act("completed", true); }}>Course terminée</button>
              </div>
            )}
          </>
        )}
        {done && c.final_price !== null && <p className="text-sm">Encaissé : <strong>{formatFcfa(c.final_price)}</strong></p>}
        {c.status === "no_show" && (
          <a className="btn-whatsapp w-full text-[12px]" href={waLink(c.customer_phone, noShowMsg)} target="_blank" rel="noopener noreferrer">Prévenir le client sur WhatsApp</a>
        )}
      </div>
    </article>
  );
}

export default function DriverApp({ loggedIn: initial }: { loggedIn: boolean }) {
  const [loggedIn, setLoggedIn] = useState(initial);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState("");
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chauffeur/courses", { cache: "no-store" });
      if (res.status === 401) {
        setLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCourses(data.bookings);
      setError("");
    } catch (e) {
      setError(navigator.onLine ? (e as Error).message || "Chargement impossible." : "Pas de connexion internet.");
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    void load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [loggedIn, load]);

  // Partage de position : envoi toutes les 15 s maximum pendant la course
  useEffect(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (!sharing) return;
    if (!("geolocation" in navigator)) {
      setGpsError("La géolocalisation n'est pas disponible sur ce téléphone.");
      return;
    }
    setGpsError("");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - lastSent.current < 15_000) return;
        lastSent.current = Date.now();
        void fetch("/api/chauffeur/position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: sharing, lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => undefined);
      },
      (err) => setGpsError(err.code === err.PERMISSION_DENIED ? "Autorisez la localisation pour ce site dans les réglages du navigateur." : "Position indisponible pour le moment."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [sharing]);

  const update = async (id: string, status: string, price?: string, pm?: string) => {
    const res = await fetch("/api/chauffeur/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: id, status, final_price: price ?? null, payment_method: pm ?? "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Mise à jour impossible.");
    await load();
  };

  const logout = async () => {
    await fetch("/api/chauffeur/logout", { method: "POST" });
    setSharing(null);
    setLoggedIn(false);
    setCourses(null);
  };

  if (!loggedIn) return <Login onDone={() => { setLoggedIn(true); window.location.reload(); }} />;

  const today = dakarDate(Date.now());
  const groups = (courses ?? []).reduce<Record<string, Course[]>>((acc, c) => {
    const d = dakarDate(Date.parse(c.start_at));
    (acc[d] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button className="text-sm underline underline-offset-4" onClick={() => void load()}>Actualiser</button>
        <button className="text-sm text-neutral-500 underline underline-offset-4" onClick={logout}>Déconnexion</button>
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      {gpsError && <p className="alert-info" role="alert">{gpsError}</p>}
      {courses === null && <p className="text-neutral-500">Chargement…</p>}
      {courses?.length === 0 && <p className="border border-line p-5 text-center text-neutral-600">Aucune course prévue dans les 7 prochains jours.</p>}
      {Object.entries(groups).map(([day, list]) => (
        <section key={day} className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.07em]">{day === today ? "Aujourd'hui" : formatDateLong(Date.parse(`${day}T12:00:00Z`))}</h2>
          {list.map((c) => <CourseCard key={c.id} c={c} sharing={sharing === c.id} onShare={setSharing} onUpdate={update} />)}
        </section>
      ))}
      <p className="text-xs text-neutral-500">Gardez cette page ouverte pendant la course pour que le client vous voie arriver.</p>
    </div>
  );
}
