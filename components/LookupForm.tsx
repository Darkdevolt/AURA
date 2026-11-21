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
}

export default function LookupForm({ whatsapp }: { whatsapp: string }) {
  const params = useSearchParams();
  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

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
  };

  const cancel = async () => {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;
    const data = await call("/api/bookings/cancel");
    if (data?.ok) {
      setInfo("Votre réservation a bien été annulée.");
      setBooking((b) => (b ? { ...b, status: "cancelled" } : b));
    }
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
            <p className="text-2xl font-extrabold">{booking.reference}</p>
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_COLORS[booking.status]}`}>
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
          {cancellable && (
            <button type="button" className="btn-outline w-full border-rose-300 text-rose-800" onClick={cancel} disabled={loading}>
              Annuler ma réservation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
