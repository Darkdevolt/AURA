"use client";

import { useActionState, useState } from "react";
import { saveDriver, saveVehicle, type ActionResult } from "@/app/admin/actions";
import { formatSenegalPhone } from "@/lib/phone";
import type { Driver, Vehicle } from "@/lib/types";

function Msg({ state }: { state: ActionResult | null }) {
  return state ? <p role="status" className={state.ok ? "text-sm text-emerald-800" : "alert-error"}>{state.message}</p> : null;
}

export function VehicleForm({ v }: { v?: Vehicle }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveVehicle, null);
  const [open, setOpen] = useState(!v);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm underline underline-offset-4">Modifier</button>
    );
  const id = v?.id ?? "new";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      {v && <input type="hidden" name="id" value={v.id} />}
      <div><label className="label" htmlFor={`vn-${id}`}>Nom</label><input id={`vn-${id}`} name="name" defaultValue={v?.name ?? ""} placeholder="Asaad 2" className="input" required /></div>
      <div><label className="label" htmlFor={`vp-${id}`}>Immatriculation</label><input id={`vp-${id}`} name="plate" defaultValue={v?.plate ?? ""} className="input" /></div>
      <div><label className="label" htmlFor={`vm-${id}`}>Modèle</label><input id={`vm-${id}`} name="model" defaultValue={v?.model ?? ""} className="input" /></div>
      <div><label className="label" htmlFor={`vc-${id}`}>Couleur</label><input id={`vc-${id}`} name="color" defaultValue={v?.color ?? ""} className="input" /></div>
      <div><label className="label" htmlFor={`vpp-${id}`}>Prix d&apos;achat (FCFA)</label><input id={`vpp-${id}`} name="purchase_price" inputMode="numeric" defaultValue={v?.purchase_price ?? ""} className="input" /></div>
      <div><label className="label" htmlFor={`vd-${id}`}>Date d&apos;achat</label><input id={`vd-${id}`} type="date" name="purchase_date" defaultValue={v?.purchase_date ?? ""} className="input" /></div>
      <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={v?.active ?? true} className="h-5 w-5" /> En service (compte dans les créneaux disponibles)
      </label>
      <div className="col-span-2"><Msg state={state} /></div>
      <button className="btn-primary col-span-2" disabled={pending}>{pending ? "…" : v ? "Enregistrer" : "Ajouter le véhicule"}</button>
    </form>
  );
}

export function DriverForm({ d, vehicles }: { d?: Driver; vehicles: Vehicle[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveDriver, null);
  const [open, setOpen] = useState(!d);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm underline underline-offset-4">Modifier / changer le code</button>
    );
  const id = d?.id ?? "new";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div><label className="label" htmlFor={`dn-${id}`}>Nom</label><input id={`dn-${id}`} name="name" defaultValue={d?.name ?? ""} className="input" required /></div>
      <div><label className="label" htmlFor={`dp-${id}`}>Téléphone</label><input id={`dp-${id}`} name="phone" type="tel" defaultValue={d ? formatSenegalPhone(d.phone) : ""} placeholder="+221 7X XXX XX XX" className="input" required /></div>
      <div><label className="label" htmlFor={`dv-${id}`}>Véhicule</label>
        <select id={`dv-${id}`} name="vehicle_id" defaultValue={d?.vehicle_id ?? (vehicles[0]?.id ?? "")} className="input">
          <option value="">—</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select></div>
      <div><label className="label" htmlFor={`dpin-${id}`}>{d ? "Nouveau code" : "Code (4 à 8 chiffres)"}</label>
        <input id={`dpin-${id}`} name="pin" inputMode="numeric" autoComplete="off" placeholder={d ? "Laisser vide = inchangé" : "ex. 2580"} className="input" /></div>
      <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={d?.active ?? true} className="h-5 w-5" /> Actif (peut se connecter)
      </label>
      <div className="col-span-2"><Msg state={state} /></div>
      <button className="btn-primary col-span-2" disabled={pending}>{pending ? "…" : d ? "Enregistrer" : "Ajouter le chauffeur"}</button>
    </form>
  );
}
