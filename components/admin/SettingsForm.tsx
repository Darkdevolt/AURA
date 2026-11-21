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
        <legend className="px-1 text-lg font-bold">Mise à disposition avec chauffeur</legend>
        <p className="col-span-2 text-sm text-neutral-600">Forfaits proposés aux clients (arrivée à l&apos;AIBD, journée de rendez-vous…). Le véhicule est bloqué pendant toute la durée.</p>
        <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="half_day_enabled" defaultChecked={s.half_day_enabled} className="h-5 w-5" /> Proposer la demi-journée</label>
        <Num name="half_day_hours" label="Demi-journée" value={s.half_day_hours} suffix="heures" />
        <Num name="half_day_price" label="Prix demi-journée" value={s.half_day_price} suffix="FCFA" />
        <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="full_day_enabled" defaultChecked={s.full_day_enabled} className="h-5 w-5" /> Proposer la journée</label>
        <Num name="full_day_hours" label="Journée" value={s.full_day_hours} suffix="heures" />
        <Num name="full_day_price" label="Prix journée" value={s.full_day_price} suffix="FCFA" />
      </fieldset>

      <fieldset className="card grid grid-cols-2 gap-3">
        <legend className="px-1 text-lg font-bold">Recharge et autonomie (véhicules électriques)</legend>
        <p className="col-span-2 text-sm text-neutral-600">
          Les pauses de recharge ne sont jamais proposées aux clients. Le site refuse aussi une réservation si les kilomètres
          prévus dans la journée dépassent l&apos;autonomie × nombre de véhicules (0 = pas de limite).
        </p>
        <Num name="range_km" label="Autonomie par véhicule et par jour" value={s.range_km} suffix="km" />
        <Num name="disposal_km_per_hour" label="Km estimés par heure de mise à disposition" value={s.disposal_km_per_hour} suffix="km/h" />
        <p className="label col-span-2 mt-2">Pauses de recharge (chaque jour d&apos;ouverture)</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr]">
            <input type="time" step={1800} name={`charge_start_${i}`} aria-label={`Début pause ${i + 1}`} defaultValue={s.charge_windows?.[i]?.start ?? ""} className="input" />
            <input type="time" step={1800} name={`charge_end_${i}`} aria-label={`Fin pause ${i + 1}`} defaultValue={s.charge_windows?.[i]?.end ?? ""} className="input" />
            <input name={`charge_label_${i}`} aria-label={`Nom pause ${i + 1}`} placeholder="Recharge" defaultValue={s.charge_windows?.[i]?.label ?? ""} className="input col-span-2 sm:col-span-1" maxLength={40} />
          </div>
        ))}
        <p className="col-span-2 text-xs text-neutral-500">Laissez une ligne vide pour la retirer. Pour une recharge exceptionnelle, utilisez « Plages ».</p>
      </fieldset>

      <fieldset className="card grid grid-cols-2 gap-3">
        <legend className="px-1 text-lg font-bold">Clients absents</legend>
        <Num name="noshow_wait_minutes" label="Attente avant « absent »" value={s.noshow_wait_minutes} suffix="min" />
        <Num name="noshow_block_after" label="Réservation en ligne bloquée après" value={s.noshow_block_after} suffix="absences, 0 = jamais" />
        <Num name="noshow_fee" label="Frais d'absence" value={s.noshow_fee} suffix="FCFA, 0 = aucun" />
        <p className="col-span-2 text-xs text-neutral-500">
          Un client bloqué voit « merci de nous appeler pour réserver ». Les frais d&apos;absence sont notés sur la réservation
          pour être réclamés à la course suivante.
        </p>
      </fieldset>

      <fieldset className="card grid grid-cols-2 gap-3">
        <legend className="px-1 text-lg font-bold">Horaires et créneaux</legend>
        <p className="col-span-2 text-sm text-neutral-600">Véhicules en service : <strong>{s.vehicles}</strong> (géré dans Flotte).</p>
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

      <fieldset className="card space-y-3">
        <legend className="px-1 text-lg font-bold">Notifications sur votre téléphone</legend>
        <p className="text-sm text-neutral-600">
          Recevez une alerte à chaque nouvelle réservation, gratuitement : installez l&apos;application <strong>ntfy</strong>{" "}
          (Android / iPhone), touchez « + », puis abonnez-vous au sujet ci-dessous. Gardez-le secret.
        </p>
        <div>
          <label className="label" htmlFor="ntfy_topic">Sujet ntfy</label>
          <input id="ntfy_topic" name="ntfy_topic" defaultValue={s.ntfy_topic ?? ""} className="input font-mono" placeholder="Vide = désactivé" />
        </div>
        {s.ntfy_topic && (
          <p className="text-sm">
            Lien direct :{" "}
            <a className="underline underline-offset-4" href={`https://ntfy.sh/${s.ntfy_topic}`} target="_blank" rel="noopener noreferrer">ntfy.sh/{s.ntfy_topic}</a>
          </p>
        )}
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
