"use client";

import { useActionState, useState, useTransition } from "react";
import { decideBooking, proposeTime, updateBooking, type ActionResult } from "@/app/admin/actions";
import { googleMapsLink, wazeLink } from "@/lib/geo";
import { formatSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { dakarDate, dakarTime, formatDateLong } from "@/lib/time";
import { PAYMENT_LABELS, STATUS_COLORS, STATUS_LABELS, type Booking, type BookingStatus } from "@/lib/types";
import { SERVICE_LABELS } from "@/lib/service";
import { waLink } from "@/lib/whatsapp";

export interface FleetOption {
  id: string;
  name: string;
}

interface Props {
  b: Booking;
  showDate?: boolean;
  vehicles: FleetOption[];
  drivers: FleetOption[];
  siteUrl: string;
  waveEnabled: boolean;
  /** Absences passées de ce client (même téléphone) */
  noShows?: number;
}

function Decision({ b, when, siteUrl, trackUrl }: { b: Booking; when: string; siteUrl: string; trackUrl: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wa, setWa] = useState<{ label: string; url: string } | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const startMs = Date.parse(b.start_at);
  const [pDate, setPDate] = useState(dakarDate(startMs));
  const [pTime, setPTime] = useState(dakarTime(startMs + 30 * 60_000));
  const lookupUrl = `${siteUrl}/ma-reservation?ref=${b.reference}`;

  const run = (fn: () => Promise<{ ok: boolean; message: string; proposedAt?: string }>, onOk: (r: { proposedAt?: string }) => { label: string; url: string }) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message });
      setWa(r.ok ? onOk(r) : null);
    });

  return (
    <div className="space-y-3 border border-gold/60 bg-neutral-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em]">Nouvelle demande — votre décision</p>
      <div className="cells grid-cols-3">
        <button type="button" disabled={pending} className="chip chip-off text-[12px] font-semibold"
          onClick={() => run(() => decideBooking(b.id, "accept"), () => ({
            label: "Envoyer la confirmation",
            url: waLink(b.customer_phone, `Bonjour ${b.customer_name}, votre course Luxus Asaad ${b.reference} du ${when} est confirmée. Suivez l'arrivée de votre chauffeur ici : ${trackUrl}`),
          }))}>Accepter</button>
        <button type="button" disabled={pending} className={`chip text-[12px] font-semibold ${showPropose ? "chip-on" : "chip-off"}`} onClick={() => setShowPropose((v) => !v)}>
          Autre horaire
        </button>
        <button type="button" disabled={pending} className="chip chip-off text-[12px] font-semibold text-rose-800"
          onClick={() => { if (confirm("Refuser cette demande ?")) run(() => decideBooking(b.id, "refuse"), () => ({
            label: "Prévenir le client",
            url: waLink(b.customer_phone, `Bonjour ${b.customer_name}, nous sommes désolés : nous ne pouvons pas assurer votre course ${b.reference} du ${when}. Appelez-nous ou répondez à ce message pour trouver un autre horaire.`),
          })); }}>Refuser</button>
      </div>
      {showPropose && (
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div><label className="label" htmlFor={`pd-${b.id}`}>Jour</label><input id={`pd-${b.id}`} type="date" className="input" value={pDate} onChange={(e) => setPDate(e.target.value)} /></div>
          <div><label className="label" htmlFor={`pt-${b.id}`}>Heure</label><input id={`pt-${b.id}`} type="time" step={1800} className="input" value={pTime} onChange={(e) => setPTime(e.target.value)} /></div>
          <button type="button" disabled={pending} className="btn-primary px-4"
            onClick={() => run(() => proposeTime(b.id, pDate, pTime), (r) => {
              const t = Date.parse(r.proposedAt!);
              const nice = `${formatDateLong(t)} à ${dakarTime(t).replace(":", "h")}`;
              return {
                label: "Envoyer la proposition",
                url: waLink(b.customer_phone, `Bonjour ${b.customer_name}, ici Luxus Asaad. Pour votre course ${b.reference}, nous ne pouvons pas assurer ${when} (recharge du véhicule électrique). Nous vous proposons le ${nice}. Acceptez ou refusez en un clic ici : ${lookupUrl}`),
              };
            })}>OK</button>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-800" : "text-rose-800"}`} role="status">{msg.text}</p>}
      {wa && (
        <a className="btn-whatsapp w-full text-[12px]" href={wa.url} target="_blank" rel="noopener noreferrer">{wa.label} sur WhatsApp</a>
      )}
    </div>
  );
}

export default function BookingCard({ b, showDate = false, vehicles, drivers, siteUrl, waveEnabled, noShows = 0 }: Props) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateBooking, null);
  const [waveState, setWaveState] = useState<"idle" | "loading" | "error">("idle");
  const [waveError, setWaveError] = useState("");
  const start = Date.parse(b.start_at);
  const when = `${formatDateLong(start)} à ${dakarTime(start).replace(":", "h")}`;
  const pickup = { lat: b.pickup_lat, lng: b.pickup_lng };
  const trackUrl = `${siteUrl}/suivi/${b.reference}?k=${b.tracking_token}`;
  const msg = `Bonjour ${b.customer_name}, ici Luxus Asaad au sujet de votre réservation ${b.reference} du ${when}.`;
  const confirmMsg = `Bonjour ${b.customer_name}, votre course Luxus Asaad ${b.reference} du ${when} est confirmée. Suivez l'arrivée de votre chauffeur ici : ${trackUrl}`;

  const sendWave = async () => {
    setWaveState("loading");
    setWaveError("");
    try {
      const res = await fetch("/api/admin/wave-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: b.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(
        waLink(b.customer_phone, `Bonjour ${b.customer_name}, voici le lien pour régler votre course ${b.reference} (${formatFcfa(data.amount)}) avec Wave : ${data.url}`),
        "_blank",
      );
      setWaveState("idle");
    } catch (e) {
      setWaveState("error");
      setWaveError((e as Error).message || "Lien Wave impossible.");
    }
  };

  return (
    <article className="card space-y-4" id={b.reference}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold tabular-nums">
            {dakarTime(start).replace(":", "h")} <span className="text-neutral-400">→ {dakarTime(Date.parse(b.blocked_until)).replace(":", "h")}</span>
          </p>
          {showDate && <p className="text-sm capitalize text-neutral-700">{formatDateLong(start)}</p>}
          {b.service && b.service !== "course" ? (
            <p className="mt-1 inline-block bg-gold-grad px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-ink">{SERVICE_LABELS[b.service]}</p>
          ) : null}
          <p className="text-sm text-neutral-600">{b.reference} · {b.passengers} pass.{b.service && b.service !== "course" ? ` · ${Math.round(b.duration_min / 60)} h` : ` · ${b.distance_km} km · ~${b.duration_min} min`}</p>
        </div>
        <span className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] ${STATUS_COLORS[b.status]}`}>
          {STATUS_LABELS[b.status]}{b.paid_online ? " · payé Wave" : ""}
        </span>
      </header>

      <div className="text-[15px]">
        <p className="font-semibold">{b.customer_name} · {formatSenegalPhone(b.customer_phone)}</p>
        {noShows > 0 && (
          <p className="mt-1 inline-block bg-rose-50 px-2 py-0.5 text-[12px] font-semibold text-rose-800">
            ⚠ {noShows} absence{noShows > 1 ? "s" : ""} déjà — appelez pour confirmer
          </p>
        )}
        {b.noshow_fee_due > 0 && <p className="text-[12px] text-rose-800">Frais d&apos;absence dus : {formatFcfa(b.noshow_fee_due)}</p>}
        {b.proposed_start_at && (
          <p className="mt-1 text-[12px] text-gold-dark">Horaire proposé au client : {formatDateLong(Date.parse(b.proposed_start_at))} à {dakarTime(Date.parse(b.proposed_start_at)).replace(":", "h")} (en attente de sa réponse)</p>
        )}
        <p className="mt-1"><span className="font-semibold text-neutral-500">A</span> {b.pickup_address}</p>
        {b.pickup_note && <p className="ml-4 text-neutral-700">↳ {b.pickup_note}</p>}
        <p><span className="font-semibold text-gold-dark">B</span> {b.dropoff_address}</p>
        {b.comment && <p className="mt-2 border-l-2 border-gold bg-neutral-50 px-3 py-2 text-neutral-800">{b.comment}</p>}
        <p className="mt-2 text-neutral-700">Estimé : <strong>{formatFcfa(b.estimated_price)}</strong></p>
      </div>

      {b.status === "pending" && <Decision b={b} when={when} siteUrl={siteUrl} trackUrl={trackUrl} />}

      <div className="cells grid-cols-2 sm:grid-cols-4">
        <a className="chip chip-off text-[13px]" href={`tel:${b.customer_phone}`}>Appeler</a>
        <a className="chip chip-off text-[13px]" href={waLink(b.customer_phone, msg)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="chip chip-off text-[13px]" href={googleMapsLink(pickup)} target="_blank" rel="noopener noreferrer">Google Maps</a>
        <a className="chip chip-off text-[13px]" href={wazeLink(pickup)} target="_blank" rel="noopener noreferrer">Waze</a>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <a className="btn-whatsapp text-[12px]" href={waLink(b.customer_phone, confirmMsg)} target="_blank" rel="noopener noreferrer">
          Confirmer + lien de suivi
        </a>
        {waveEnabled ? (
          <button type="button" className="btn-outline text-[12px]" onClick={sendWave} disabled={waveState === "loading" || b.paid_online}>
            {b.paid_online ? "Déjà payé par Wave" : waveState === "loading" ? "Création du lien…" : "Envoyer un lien Wave"}
          </button>
        ) : (
          <a className="btn-outline text-[12px]" href={trackUrl} target="_blank" rel="noopener noreferrer">Voir le suivi client</a>
        )}
      </div>
      {waveError && <p className="alert-error">{waveError}</p>}

      <form action={action} className="grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3">
        <input type="hidden" name="id" value={b.id} />
        <div>
          <label className="label" htmlFor={`st-${b.id}`}>Statut</label>
          <select id={`st-${b.id}`} name="status" defaultValue={b.status} className="input">
            {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`fp-${b.id}`}>Prix payé</label>
          <input id={`fp-${b.id}`} name="final_price" inputMode="numeric" className="input" defaultValue={b.final_price ?? ""} placeholder={String(b.estimated_price)} />
        </div>
        <div>
          <label className="label" htmlFor={`pm-${b.id}`}>Paiement</label>
          <select id={`pm-${b.id}`} name="payment_method" defaultValue={b.payment_method ?? ""} className="input">
            <option value="">—</option>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`vh-${b.id}`}>Véhicule</label>
          <select id={`vh-${b.id}`} name="vehicle_id" defaultValue={b.vehicle_id ?? ""} className="input">
            <option value="">—</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`dr-${b.id}`}>Chauffeur</label>
          <select id={`dr-${b.id}`} name="driver_id" defaultValue={b.driver_id ?? ""} className="input">
            <option value="">—</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button className="btn-primary col-span-2 self-end sm:col-span-1" disabled={pending}>{pending ? "…" : "Enregistrer"}</button>
        {state && <p role="status" className={`col-span-2 text-sm sm:col-span-3 ${state.ok ? "text-emerald-800" : "text-rose-800"}`}>{state.message}</p>}
      </form>
    </article>
  );
}
