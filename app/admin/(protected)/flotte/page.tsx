import ConfirmButton from "@/components/admin/ConfirmButton";
import { DriverForm, VehicleDocForm, VehicleForm } from "@/components/admin/FleetForms";
import { deleteVehicleDoc } from "../../actions";
import { docStatus, type DocStatus } from "@/lib/fleet";
import { dakarDate } from "@/lib/time";
import { SITE_URL } from "@/lib/env";
import { formatSenegalPhone } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { requireAdmin } from "@/lib/supabase/server";
import { DOC_KINDS, type Driver, type Vehicle, type VehicleDoc } from "@/lib/types";

const fr = (d: string | null | undefined) => (d ? d.split("-").reverse().join("/") : "—");
const BADGE: Record<DocStatus, string> = {
  expire: "border-rose-300 bg-rose-50 text-rose-800",
  bientot: "border-amber-300 bg-amber-50 text-amber-900",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800",
  sans_date: "border-line bg-neutral-50 text-neutral-600",
};
const BADGE_TEXT: Record<DocStatus, string> = { expire: "Expiré", bientot: "Expire bientôt", ok: "Valide", sans_date: "Sans date" };

export default async function FleetPage() {
  const { supabase } = (await requireAdmin())!;
  const [vRes, dRes, docRes] = await Promise.all([
    supabase.from("luxus_vehicles").select("*").order("created_at"),
    supabase.from("luxus_drivers").select("*").order("created_at"),
    supabase.from("luxus_vehicle_docs").select("*").order("created_at", { ascending: false }),
  ]);
  const vehicles = (vRes.data ?? []) as Vehicle[];
  const docs = (docRes.data ?? []) as VehicleDoc[];
  const today = dakarDate(Date.now());
  const paths = docs.map((d) => d.file_path).filter((p): p is string => !!p);
  const signed = paths.length ? (await supabase.storage.from("luxus-vehicles").createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlOf = (p: string | null) => (p ? signed.find((x) => x.path === p)?.signedUrl ?? undefined : undefined);
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
            <li key={v.id} className="space-y-4 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-brand text-[15px]">{v.name} {!v.active && <span className="ml-1 text-xs font-normal normal-case text-neutral-500">(hors service)</span>}</p>
                <p className="text-xs text-neutral-500">{v.plate ?? "Sans plaque"}</p>
              </div>
              <dl className="cells grid-cols-2 text-[13px] sm:grid-cols-3">
                {[
                  ["Modèle", [v.model, v.version].filter(Boolean).join(" · ") || "—"],
                  ["Couleur", v.color ?? "—"],
                  ["Prise", v.plug ?? "—"],
                  ["Prix d'achat", v.purchase_price ? formatFcfa(v.purchase_price) : "—"],
                  ["Mise en service", fr(v.in_service_on)],
                  ["Km à l'achat", v.odometer_start_km != null ? `${v.odometer_start_km.toLocaleString("fr-FR")} km` : "—"],
                ].map(([k, val]) => (
                  <div key={k} className="bg-white px-3 py-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{k}</dt>
                    <dd className="font-semibold">{val}</dd>
                  </div>
                ))}
              </dl>
              {v.notes && <p className="text-[13px] text-neutral-600">{v.notes}</p>}

              {/* Photos */}
              {docs.some((d) => d.vehicle_id === v.id && d.kind === "photo") && (
                <div className="flex gap-2 overflow-x-auto">
                  {docs.filter((d) => d.vehicle_id === v.id && d.kind === "photo").map((d) => (
                    <a key={d.id} href={urlOf(d.file_path)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urlOf(d.file_path)} alt={d.title ?? "Photo du véhicule"} className="h-24 w-36 border border-line object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {/* Documents et échéances */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-neutral-600">Documents</p>
                {docs.filter((d) => d.vehicle_id === v.id && d.kind !== "photo").length === 0 && (
                  <p className="text-[13px] text-neutral-500">Aucun document. Ajoutez la carte grise, l&apos;assurance et la visite technique avec leurs dates d&apos;expiration : un rappel s&apos;affichera 30 jours avant.</p>
                )}
                <ul className="divide-y divide-line border-y border-line">
                  {docs.filter((d) => d.vehicle_id === v.id).map((d) => {
                    const st = docStatus(d.expires_on, today);
                    return (
                      <li key={d.id} className="flex items-center gap-2 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold">{DOC_KINDS[d.kind]}{d.title ? ` · ${d.title}` : ""}</p>
                          <p className="text-[11px] text-neutral-500">{[d.number && `N° ${d.number}`, d.expires_on && `expire le ${fr(d.expires_on)}`].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                        {d.kind !== "photo" && <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase ${BADGE[st]}`}>{BADGE_TEXT[st]}</span>}
                        {urlOf(d.file_path) && <a href={urlOf(d.file_path)} target="_blank" rel="noopener noreferrer" className="text-[11px] underline underline-offset-4">Voir</a>}
                        <form action={deleteVehicleDoc}>
                          <input type="hidden" name="id" value={d.id} />
                          <ConfirmButton message={`Supprimer « ${DOC_KINDS[d.kind]} » ?`} label="Supprimer" className="flex h-10 w-9 items-center justify-center text-lg text-neutral-400 hover:text-rose-700">×</ConfirmButton>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <details className="border border-line p-3">
                <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.05em]">+ Ajouter une photo ou un document</summary>
                <div className="mt-3"><VehicleDocForm vehicleId={v.id} /></div>
              </details>
              <details className="border border-line p-3">
                <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.05em]">Modifier la fiche</summary>
                <div className="mt-3"><VehicleForm v={v} /></div>
              </details>
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
