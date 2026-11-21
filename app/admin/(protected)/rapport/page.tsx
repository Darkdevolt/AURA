import Link from "next/link";
import ReportActions from "@/components/admin/ReportActions";
import ReportDocument from "@/components/admin/ReportDocument";
import { loadReport, parsePeriod, presetPeriods } from "@/lib/report";
import { requireAdmin } from "@/lib/supabase/server";
import { dakarDate } from "@/lib/time";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ du?: string; au?: string; periode?: string; vehicule?: string }> }) {
  const { supabase } = (await requireAdmin())!;
  const sp = await searchParams;
  const today = dakarDate(Date.now());
  const period = parsePeriod(sp, today);
  const vehicleId = sp.vehicule || null;
  const r = await loadReport(supabase, period, vehicleId);
  const vehName = vehicleId ? (r.vehicles.find((v) => v.id === vehicleId)?.name ?? null) : null;
  const qs = new URLSearchParams({ du: period.from, au: period.to, ...(vehicleId ? { vehicule: vehicleId } : {}) }).toString();

  return (
    <div className="space-y-6">
      {/* Choix de la période (masqué à l'impression) */}
      <div className="space-y-4 print:hidden">
        <div>
          <p className="eyebrow">Banque · investisseurs</p>
          <h1 className="font-brand mt-1 text-2xl">Rapport d&apos;activité</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {presetPeriods(today).map((p) => (
            <Link key={p.key} href={`/admin/rapport?periode=${p.key}${vehicleId ? `&vehicule=${vehicleId}` : ""}`}
              className={`inline-flex min-h-10 items-center border px-3 text-[11px] font-semibold uppercase tracking-[0.05em] ${p.period.from === period.from && p.period.to === period.to ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
              {p.period.label}
            </Link>
          ))}
        </div>
        <form action="/admin/rapport" className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div><label className="label" htmlFor="du">Du</label><input id="du" type="date" name="du" defaultValue={period.from} className="input" /></div>
          <div><label className="label" htmlFor="au">Au</label><input id="au" type="date" name="au" defaultValue={period.to} className="input" /></div>
          <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="vehicule">Véhicule</label>
            <select id="vehicule" name="vehicule" defaultValue={vehicleId ?? ""} className="input">
              <option value="">Toute la flotte</option>
              {r.vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></div>
          <button className="btn-outline col-span-2 sm:col-span-1">Afficher</button>
        </form>
        <ReportActions excelHref={`/api/admin/rapport?${qs}`} />
      </div>

      <ReportDocument r={r} vehName={vehName} />
    </div>
  );
}
