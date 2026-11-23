"use client";

import { useActionState, useState } from "react";
import { saveDriver, saveFixedCost, saveLoan, saveVehicle, saveVehicleDoc, type ActionResult } from "@/app/admin/actions";
import { formatSenegalPhone } from "@/lib/phone";
import { DOC_KINDS, FIXED_COST_KINDS, type Driver, type FixedCost, type Loan, type Vehicle } from "@/lib/types";

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
      <div><label className="label" htmlFor={`vv-${id}`}>Version</label><input id={`vv-${id}`} name="version" defaultValue={v?.version ?? ""} placeholder="Version chinoise 2021" className="input" /></div>
      <div><label className="label" htmlFor={`vpl-${id}`}>Prise de recharge</label><input id={`vpl-${id}`} name="plug" defaultValue={v?.plug ?? ""} placeholder="GB/T" className="input" /></div>
      <div><label className="label" htmlFor={`vs-${id}`}>Mise en service</label><input id={`vs-${id}`} type="date" name="in_service_on" defaultValue={v?.in_service_on ?? ""} className="input" /></div>
      <div><label className="label" htmlFor={`vk-${id}`}>Km à l&apos;achat</label><input id={`vk-${id}`} name="odometer_start_km" inputMode="numeric" defaultValue={v?.odometer_start_km ?? ""} className="input" /></div>
      <div className="col-span-2"><label className="label" htmlFor={`vno-${id}`}>Notes</label><textarea id={`vno-${id}`} name="notes" defaultValue={v?.notes ?? ""} maxLength={1000} className="input min-h-20" /></div>
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

/** Ajout d'un document ou d'une photo à la fiche du véhicule */
export function VehicleDocForm({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveVehicleDoc, null);
  const [kind, setKind] = useState("assurance");
  const isPhoto = kind === "photo";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <div className="col-span-2"><label className="label" htmlFor={`dk-${vehicleId}`}>Type</label>
        <select id={`dk-${vehicleId}`} name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input">
          {Object.entries(DOC_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
      {!isPhoto && <>
        <div><label className="label" htmlFor={`dnum-${vehicleId}`}>N° / police</label><input id={`dnum-${vehicleId}`} name="number" className="input" /></div>
        <div><label className="label" htmlFor={`dexp-${vehicleId}`}>Expire le</label><input id={`dexp-${vehicleId}`} type="date" name="expires_on" className="input" /></div>
      </>}
      <div className="col-span-2"><label className="label" htmlFor={`dt-${vehicleId}`}>{isPhoto ? "Légende" : "Intitulé / assureur"}</label><input id={`dt-${vehicleId}`} name="title" maxLength={120} className="input" /></div>
      <div className="col-span-2"><label className="label" htmlFor={`df-${vehicleId}`}>{isPhoto ? "Photo" : "Fichier (photo ou PDF, facultatif)"}</label>
        <input id={`df-${vehicleId}`} type="file" name="file" accept={isPhoto ? "image/*" : "image/*,application/pdf"} className="block w-full text-sm file:mr-3 file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-[12px] file:font-semibold file:uppercase file:text-white" required={isPhoto} /></div>
      <div className="col-span-2"><Msg state={state} /></div>
      <button className="btn-primary col-span-2" disabled={pending}>{pending ? "Envoi…" : isPhoto ? "Ajouter la photo" : "Enregistrer le document"}</button>
    </form>
  );
}

/** Charge fixe mensuelle (salaire, prêt, réserve entretien, amortissement…) */
export function FixedCostForm({ c, vehicles }: { c?: FixedCost; vehicles: Vehicle[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveFixedCost, null);
  const id = c?.id ?? "new";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div><label className="label" htmlFor={`fk-${id}`}>Type</label>
        <select id={`fk-${id}`} name="kind" defaultValue={c?.kind ?? "autre"} className="input">
          {Object.entries(FIXED_COST_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></div>
      <div><label className="label" htmlFor={`fm-${id}`}>Par mois (FCFA)</label><input id={`fm-${id}`} name="monthly_amount" inputMode="numeric" defaultValue={c?.monthly_amount ?? ""} className="input" required /></div>
      <div className="col-span-2"><label className="label" htmlFor={`fl-${id}`}>Libellé</label><input id={`fl-${id}`} name="label" defaultValue={c?.label ?? ""} maxLength={80} className="input" required /></div>
      <div><label className="label" htmlFor={`fv-${id}`}>Véhicule</label>
        <select id={`fv-${id}`} name="vehicle_id" defaultValue={c?.vehicle_id ?? vehicles[0]?.id ?? ""} className="input">
          <option value="">Toute la flotte</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select></div>
      <div className="col-span-2"><label className="label" htmlFor={`fc-${id}`}>Plafond (facultatif)</label>
        <input id={`fc-${id}`} name="cap_amount" inputMode="numeric" defaultValue={c?.cap_amount ?? ""} placeholder="ex. 300 000 : la mise de côté s'arrête une fois atteint" className="input" /></div>
      <div><label className="label" htmlFor={`fs-${id}`}>À partir du</label><input id={`fs-${id}`} type="date" name="starts_on" defaultValue={c?.starts_on ?? ""} className="input" /></div>
      <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="h-5 w-5" /> Active
      </label>
      <div className="col-span-2"><Msg state={state} /></div>
      <button className="btn-primary col-span-2" disabled={pending}>{pending ? "…" : c ? "Enregistrer" : "Ajouter la charge"}</button>
    </form>
  );
}

/** Paramètres du prêt du véhicule */
export function LoanForm({ l, vehicles }: { l?: Loan; vehicles: Vehicle[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveLoan, null);
  const id = l?.id ?? "new";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="col-span-2"><label className="label" htmlFor={`ll-${id}`}>Libellé</label><input id={`ll-${id}`} name="label" defaultValue={l?.label ?? "Prêt véhicule"} className="input" /></div>
      <div><label className="label" htmlFor={`lp-${id}`}>Capital emprunté</label><input id={`lp-${id}`} name="principal" inputMode="numeric" defaultValue={l?.principal ?? ""} placeholder="à saisir" className="input" /></div>
      <div><label className="label" htmlFor={`lm-${id}`}>Mensualité</label><input id={`lm-${id}`} name="monthly_payment" inputMode="numeric" defaultValue={l?.monthly_payment ?? ""} className="input" required /></div>
      <div><label className="label" htmlFor={`lr-${id}`}>Taux annuel (%)</label><input id={`lr-${id}`} name="annual_rate" inputMode="decimal" defaultValue={l?.annual_rate ?? "10.49"} className="input" /></div>
      <div><label className="label" htmlFor={`ln-${id}`}>Durée (mois)</label><input id={`ln-${id}`} name="months" inputMode="numeric" defaultValue={l?.months ?? 84} className="input" /></div>
      <div><label className="label" htmlFor={`ld-${id}`}>1re échéance</label><input id={`ld-${id}`} type="date" name="first_due_on" defaultValue={l?.first_due_on ?? ""} className="input" /></div>
      <div><label className="label" htmlFor={`lv-${id}`}>Véhicule</label>
        <select id={`lv-${id}`} name="vehicle_id" defaultValue={l?.vehicle_id ?? vehicles[0]?.id ?? ""} className="input">
          <option value="">—</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select></div>
      <div className="col-span-2"><label className="label" htmlFor={`lb-${id}`}>Banque / prêteur</label><input id={`lb-${id}`} name="lender" defaultValue={l?.lender ?? ""} className="input" /></div>
      <div className="col-span-2"><Msg state={state} /></div>
      <button className="btn-primary col-span-2" disabled={pending}>{pending ? "…" : "Enregistrer le prêt"}</button>
    </form>
  );
}
