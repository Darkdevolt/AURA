"use client";

import { useActionState } from "react";
import { updateSettings, type ActionResult } from "@/app/admin/actions";
import { formatSenegalPhone } from "@/lib/phone";
import type { Settings } from "@/lib/types";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function Num({ name, label, value, suffix }: { name: string; label: string; value: number; suffix?: string }) {
  return (
    <div>
      <label className="label text-sm" htmlFor={name}>{label}{suffix && <span className="font-normal text-neutral-600"> ({suffix})</span>}</label>
      <input id={name} name={name} inputMode="numeric" defaultValue={value} className="input" required />
    </div>
  );
}

export default function SettingsForm({ s }: { s: Settings }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateSettings, null);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="card grid grid-cols-2 gap-3">
        <legend className="px-1 text-lg font-bold">Tarifs</legend>
        <Num name="pickup_fee" label="Prise en charge" value={s.pickup_fee} suffix="FCFA" />
        <Num name="price_per_km" label="Prix par km" value={s.price_per_km} suffix="FCFA" />
        <Num name="min_fare" label="Course minimum" value={s.min_fare} suffix="FCFA" />
        <Num name="round_to" label="Arrondi supérieur" value={s.round_to} suffix="FCFA" />
        <Num name="airport_fixed_price" label="Forfait Aéroport AIBD" value={s.airport_fixed_price} suffix="FCFA" />
        <label className="flex min-h-11 items-end gap-2 pb-3 text-[15px]">
          <input type="checkbox" name="airport_enabled" defaultChecked={s.airport_enabled} className="h-5 w-5" /> Forfait AIBD actif
        </label>
      </fieldset>

      <fieldset className="card grid grid-cols-2 gap-3">
        <legend className="px-1 text-lg font-bold">Horaires et créneaux</legend>
        <div><label className="label text-sm" htmlFor="open_time">Ouverture</label><input id="open_time" type="time" name="open_time" defaultValue={s.open_time.slice(0, 5)} className="input" /></div>
        <div><label className="label text-sm" htmlFor="close_time">Fermeture</label><input id="close_time" type="time" name="close_time" defaultValue={s.close_time.slice(0, 5)} className="input" /></div>
        <div className="col-span-2">
          <p className="label text-sm">Jours d&apos;ouverture</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label key={d} className="chip gap-1.5 border-neutral-300">
                <input type="checkbox" name="open_days" value={i} defaultChecked={s.open_days.includes(i)} className="h-4 w-4" /> {d}
              </label>
            ))}
          </div>
        </div>
        <Num name="slot_minutes" label="Durée d'un créneau" value={s.slot_minutes} suffix="min" />
        <Num name="approach_minutes" label="Trajet d'approche" value={s.approach_minutes} suffix="min" />
        <Num name="margin_minutes" label="Marge" value={s.margin_minutes} suffix="min" />
        <Num name="min_notice_minutes" label="Délai minimum" value={s.min_notice_minutes} suffix="min" />
        <Num name="max_days_ahead" label="Réservation max." value={s.max_days_ahead} suffix="jours" />
        <Num name="vehicles" label="Nombre de véhicules" value={s.vehicles} />
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="px-1 text-lg font-bold">Lignes « Appeler pour réserver »</legend>
        <p className="text-sm text-neutral-600">
          Affichées sur l&apos;accueil, la page Contact et en bas de chaque page (ex. « Asaad 1 », « Asaad 2 »). Laissez vide
          pour retirer une ligne. Cochez « WhatsApp » si le numéro est sur WhatsApp : <strong>la première ligne WhatsApp reçoit
          les réservations</strong> envoyées par les clients.
        </p>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_1.4fr] gap-2 border-t border-line pt-3 first:border-0 first:pt-0">
            <input name={`line_label_${i}`} aria-label={`Nom de la ligne ${i + 1}`} placeholder={`Asaad ${i + 1}`} defaultValue={s.contact_lines[i]?.label ?? ""} className="input" maxLength={40} />
            <input name={`line_phone_${i}`} aria-label={`Numéro de la ligne ${i + 1}`} type="tel" placeholder="+221 7X XXX XX XX" defaultValue={s.contact_lines[i] ? formatSenegalPhone(s.contact_lines[i].phone) : ""} className="input" />
            <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" name={`line_wa_${i}`} defaultChecked={s.contact_lines[i] ? s.contact_lines[i].whatsapp !== false : i === 0} className="h-5 w-5" />
              Ce numéro est sur WhatsApp
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset className="card grid grid-cols-2 gap-3">
        <legend className="px-1 text-lg font-bold">Anti-spam</legend>
        <Num name="max_active_per_phone" label="Réservations actives / numéro" value={s.max_active_per_phone} />
        <Num name="max_per_ip_per_day" label="Réservations / connexion / 24 h" value={s.max_per_ip_per_day} />
      </fieldset>

      {state && <p role="status" className={state.ok ? "alert-info" : "alert-error"}>{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les réglages"}</button>
    </form>
  );
}
