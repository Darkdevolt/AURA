import { DriverForm, VehicleForm } from "@/components/admin/FleetForms";
import { SITE_URL } from "@/lib/env";
import { formatSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { requireAdmin } from "@/lib/supabase/server";
import type { Driver, Vehicle } from "@/lib/types";

export default async function FleetPage() {
  const { supabase } = (await requireAdmin())!;
  const [vRes, dRes] = await Promise.all([
    supabase.from("luxus_vehicles").select("*").order("created_at"),
    supabase.from("luxus_drivers").select("*").order("created_at"),
  ]);
  const vehicles = (vRes.data ?? []) as Vehicle[];
  const drivers = (dRes.data ?? []) as Driver[];
  const activeCount = vehicles.filter((v) => v.active).length;

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Flotte</p>
        <h1 className="font-brand mt-1 text-2xl">Véhicules &amp; chauffeurs</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {activeCount} véhicule{activeCount > 1 ? "s" : ""} en service : le site accepte autant de courses en même temps.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="veh">
        <h2 id="veh" className="text-[13px] font-bold uppercase tracking-[0.07em]">Véhicules</h2>
        <ul className="divide-y divide-line border-y border-line">
          {vehicles.map((v) => (
            <li key={v.id} className="space-y-3 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-brand text-[15px]">{v.name} {!v.active && <span className="ml-1 text-xs font-normal normal-case text-neutral-500">(hors service)</span>}</p>
                <p className="text-xs text-neutral-500">{[v.model, v.color, v.plate].filter(Boolean).join(" · ")}</p>
              </div>
              {v.purchase_price ? <p className="text-xs text-neutral-500">Achat : {formatFcfa(v.purchase_price)}{v.purchase_date ? ` le ${v.purchase_date.split("-").reverse().join("/")}` : ""}</p> : null}
              <VehicleForm v={v} />
            </li>
          ))}
        </ul>
        <details className="border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.05em]">+ Ajouter un véhicule</summary>
          <div className="mt-4"><VehicleForm /></div>
        </details>
      </section>

      <section className="space-y-4" aria-labelledby="drv">
        <h2 id="drv" className="text-[13px] font-bold uppercase tracking-[0.07em]">Chauffeurs</h2>
        <p className="text-sm text-neutral-600">
          Chaque chauffeur se connecte sur <strong>{SITE_URL().replace("https://", "")}/chauffeur</strong> avec son téléphone et
          son code : il voit ses courses, change leur statut et partage sa position avec le client.
        </p>
        {drivers.length === 0 && <p className="text-sm text-neutral-500">Aucun chauffeur pour l&apos;instant.</p>}
        <ul className="divide-y divide-line border-y border-line">
          {drivers.map((d) => (
            <li key={d.id} className="space-y-3 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{d.name} {!d.active && <span className="text-xs font-normal text-neutral-500">(désactivé)</span>}</p>
                <p className="text-xs text-neutral-500">{formatSenegalPhone(d.phone)} · {vehicles.find((v) => v.id === d.vehicle_id)?.name ?? "—"}</p>
              </div>
              <DriverForm d={d} vehicles={vehicles} />
            </li>
          ))}
        </ul>
        <details className="border border-line p-4" open={drivers.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.05em]">+ Ajouter un chauffeur</summary>
          <div className="mt-4"><DriverForm vehicles={vehicles} /></div>
        </details>
      </section>
    </div>
  );
}
