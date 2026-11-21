"use client";

import { useActionState, useState } from "react";
import { createBlock, type ActionResult } from "@/app/admin/actions";

export default function BlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createBlock, null);
  const [allDay, setAllDay] = useState(false);
  return (
    <form action={action} className="card space-y-3">
      <h2 className="text-lg font-bold">Bloquer une plage</h2>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label text-sm" htmlFor="bd">Date de début</label><input id="bd" type="date" name="date" defaultValue={today} className="input" required /></div>
        <div><label className="label text-sm" htmlFor="be">Date de fin</label><input id="be" type="date" name="end_date" defaultValue={today} className="input" /></div>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-[15px]">
        <input type="checkbox" name="all_day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-5 w-5" />
        Journée(s) entière(s) (jour off)
      </label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label text-sm" htmlFor="bs">De</label><input id="bs" type="time" name="start_time" defaultValue="13:00" step={1800} className="input" /></div>
          <div><label className="label text-sm" htmlFor="bt">À</label><input id="bt" type="time" name="end_time" defaultValue="14:00" step={1800} className="input" /></div>
        </div>
      )}
      <div>
        <label className="label text-sm" htmlFor="br">Motif</label>
        <input id="br" name="reason" className="input" list="reasons" placeholder="Recharge, pause, jour off…" maxLength={200} />
        <datalist id="reasons"><option value="Recharge" /><option value="Pause déjeuner" /><option value="Jour off" /><option value="Entretien" /></datalist>
      </div>
      {state && <p role="status" className={state.ok ? "text-emerald-800" : "alert-error"}>{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "…" : "Ajouter"}</button>
    </form>
  );
}
