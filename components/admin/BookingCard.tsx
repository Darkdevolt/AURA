"use client";

import { useActionState } from "react";
import { updateBooking, type ActionResult } from "@/app/admin/actions";
import { googleMapsLink, wazeLink } from "@/lib/geo";
import { formatSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { dakarTime, formatDateLong } from "@/lib/time";
import { PAYMENT_LABELS, STATUS_COLORS, STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";

export default function BookingCard({ b, showDate = false }: { b: Booking; showDate?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateBooking, null);
  const start = Date.parse(b.start_at);
  const pickup = { lat: b.pickup_lat, lng: b.pickup_lng };
  const msg = `Bonjour ${b.customer_name}, ici Luxus Asaad au sujet de votre réservation ${b.reference} du ${formatDateLong(start)} à ${dakarTime(start).replace(":", "h")}.`;

  return (
    <article className="card space-y-3" id={b.reference}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold">
            {dakarTime(start).replace(":", "h")} <span className="text-neutral-500">→ {dakarTime(Date.parse(b.blocked_until)).replace(":", "h")}</span>
          </p>
          {showDate && <p className="text-sm capitalize text-neutral-700">{formatDateLong(start)}</p>}
          <p className="text-sm text-neutral-600">{b.reference} · {b.passengers} pass. · {b.distance_km} km · ~{b.duration_min} min</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_COLORS[b.status]}`}>{STATUS_LABELS[b.status]}</span>
      </header>

      <div className="text-[15px]">
        <p className="font-semibold">{b.customer_name} · {formatSenegalPhone(b.customer_phone)}</p>
        <p className="mt-1"><span className="font-semibold text-neutral-600">A</span> {b.pickup_address}</p>
        {b.pickup_note && <p className="ml-4 text-neutral-700">↳ {b.pickup_note}</p>}
        <p><span className="font-semibold text-neutral-600">B</span> {b.dropoff_address}</p>
        {b.comment && <p className="mt-1 rounded-lg bg-cream px-3 py-2 text-neutral-800">💬 {b.comment}</p>}
        <p className="mt-1 text-neutral-700">Estimé : <strong>{formatFcfa(b.estimated_price)}</strong></p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a className="btn-outline px-2 text-[15px]" href={`tel:${b.customer_phone}`}>Appeler</a>
        <a className="btn-whatsapp px-2 text-[15px]" href={waLink(b.customer_phone, msg)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="btn-outline px-2 text-[15px]" href={googleMapsLink(pickup)} target="_blank" rel="noopener noreferrer">Google Maps</a>
        <a className="btn-outline px-2 text-[15px]" href={wazeLink(pickup)} target="_blank" rel="noopener noreferrer">Waze</a>
      </div>

      <form action={action} className="grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="id" value={b.id} />
        <div>
          <label className="label text-sm" htmlFor={`st-${b.id}`}>Statut</label>
          <select id={`st-${b.id}`} name="status" defaultValue={b.status} className="input">
            {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-sm" htmlFor={`fp-${b.id}`}>Prix payé (FCFA)</label>
          <input id={`fp-${b.id}`} name="final_price" inputMode="numeric" className="input" defaultValue={b.final_price ?? ""} placeholder={String(b.estimated_price)} />
        </div>
        <div>
          <label className="label text-sm" htmlFor={`pm-${b.id}`}>Paiement</label>
          <select id={`pm-${b.id}`} name="payment_method" defaultValue={b.payment_method ?? ""} className="input">
            <option value="">—</option>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
        {state && <p role="status" className={`text-sm sm:col-span-4 ${state.ok ? "text-emerald-800" : "text-rose-800"}`}>{state.message}</p>}
      </form>
    </article>
  );
}
