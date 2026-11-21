"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { dakarTime, formatDateLong } from "@/lib/time";
import { STATUS_COLORS, STATUS_LABELS, type BookingStatus } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

interface PublicBooking {
  reference: string;
  customer_name: string;
  pickup_address: string;
  pickup_note: string | null;
  dropoff_address: string;
  start_at: string;
  passengers: number;
  distance_km: number;
  duration_min: number;
  estimated_price: number;
  status: BookingStatus;
  tracking_token?: string;
}

interface HistoryItem {
  reference: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_note: string | null;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  start_at: string;
  passengers: number;
  estimated_price: number;
  final_price: number | null;
  status: BookingStatus;
  tracking_token: string;
}

export default function LookupForm({ whatsapp }: { whatsapp: string }) {
  const params = useSearchParams();
  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const last = JSON.parse(localStorage.getItem("la:last") || "null");
      if (last && (!params.get("ref") || params.get("ref") === last.reference)) {
        setReference(last.reference);
        setPhone(last.phone);
      }
    } catch {
      /* ignore */
    }
  }, [params]);

  const call = async (path: string) => {
    setError("");
    setInfo("");
    if (!/^LA-\d{4,}$/i.test(reference.trim())) return setError("Numéro de réservation invalide (ex. LA-0001)."), null;
    if (!normalizeSenegalPhone(phone)) return setError("Numéro de téléphone invalide (ex. +221 77 123 45 67)."), null;
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim(), phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return null;
      }
      return data;
    } catch {
      setError(navigator.onLine ? "Le serveur ne répond pas. Réessayez." : "Pas de connexion internet.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const lookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const data = await call("/api/bookings/lookup");
    setBooking(data?.booking ?? null);
    setHistory([]);
    if (data?.booking) {
      const h = await fetch("/api/client/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim(), phone }),
      })
        .then((r) => (r.ok ? r.json() : { bookings: [] }))
        .catch(() => ({ bookings: [] }));
      setHistory(h.bookings ?? []);
    }
  };

  const cancel = async () => {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;
    const data = await call("/api/bookings/cancel");
    if (data?.ok) {
      setInfo("Votre réservation a bien été annulée.");
      setBooking((b) => (b ? { ...b, status: "cancelled" } : b));
    }
  };

  const rebook = (h: HistoryItem) => {
    try {
      localStorage.setItem(
        "la:prefill",
        JSON.stringify({
          pickup: { lat: h.pickup_lat, lng: h.pickup_lng, address: h.pickup_address },
          dropoff: { lat: h.dropoff_lat, lng: h.dropoff_lng, address: h.dropoff_address },
          pickupNote: h.pickup_note ?? "",
          passengers: h.passengers,
        }),
      );
    } catch {
      /* stockage indisponible */
    }
    window.location.href = "/#reserver";
  };

  const start = booking ? Date.parse(booking.start_at) : 0;
  const cancellable = booking && ["pending", "confirmed"].includes(booking.status) && start > Date.now();

  return (
    <div className="space-y-4">
      <form onSubmit={lookup} className="card space-y-3" noValidate>
        <div>
          <label htmlFor="ref" className="label">Numéro de réservation</label>
          <input id="ref" className="input uppercase" placeholder="LA-0001" value={reference} onChange={(e) => setReference(e.target.value)} autoCapitalize="characters" />
        </div>
        <div>
          <label htmlFor="tel" className="label">Téléphone utilisé pour la réservation</label>
          <input id="tel" className="input" type="tel" inputMode="tel" placeholder="+221 77 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Recherche…" : "Retrouver ma réservation"}</button>
      </form>

      {info && <p className="alert-info" role="status">{info}</p>}

      {booking && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-brand text-2xl">{booking.reference}</p>
            <span className={`border px-3 py-1 text-xs font-semibold uppercase ${STATUS_COLORS[booking.status]}`}>
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-neutral-600">Date</dt>
            <dd className="font-semibold">{formatDateLong(start)} à {dakarTime(start).replace(":", "h")}</dd>
            <dt className="text-neutral-600">Départ</dt>
            <dd>{booking.pickup_address}{booking.pickup_note && <span className="block text-neutral-600">{booking.pickup_note}</span>}</dd>
            <dt className="text-neutral-600">Destination</dt>
            <dd>{booking.dropoff_address}</dd>
            <dt className="text-neutral-600">Passagers</dt>
            <dd>{booking.passengers}</dd>
            <dt className="text-neutral-600">Prix estimé</dt>
            <dd className="font-semibold">{formatFcfa(booking.estimated_price)}</dd>
          </dl>
          <a className="btn-whatsapp w-full" target="_blank" rel="noopener noreferrer"
            href={waLink(whatsapp, `Bonjour Luxus Asaad, je vous contacte au sujet de ma réservation ${booking.reference}.`)}>
            Nous écrire sur WhatsApp
          </a>
          {booking.tracking_token && ["pending", "confirmed", "in_progress"].includes(booking.status) && (
            <a className="btn-outline w-full text-[12px]" href={`/suivi/${booking.reference}?k=${booking.tracking_token}`}>Suivre mon chauffeur</a>
          )}
          {cancellable && (
            <button type="button" className="btn w-full border border-rose-300 bg-white text-rose-800 hover:bg-rose-50" onClick={cancel} disabled={loading}>
              Annuler ma réservation
            </button>
          )}
        </div>
      )}

      {history.length > 1 && (
        <section aria-labelledby="hist" className="space-y-3">
          <h2 id="hist" className="text-[13px] font-bold uppercase tracking-[0.07em]">Mes courses ({history.length})</h2>
          <ul className="divide-y divide-line border-y border-line">
            {history.map((h) => {
              const t = Date.parse(h.start_at);
              return (
                <li key={h.reference} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{formatDateLong(t)} · {dakarTime(t).replace(":", "h")}</p>
                    <span className="text-xs text-neutral-500">{h.reference} · {STATUS_LABELS[h.status]}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-700">{h.pickup_address} → {h.dropoff_address}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm tabular-nums">{formatFcfa(h.final_price ?? h.estimated_price)}</span>
                    <button type="button" onClick={() => rebook(h)} className="text-[12px] font-semibold uppercase tracking-[0.05em] text-gold-dark underline underline-offset-4">
                      Réserver à nouveau
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
