import Link from "next/link";
import { lastMonths, monthRange, monthly, monthsToPayback, paybackPercent, summarize, type FinData } from "@/lib/finance";
import { formatFcfa } from "@/lib/pricing";
import { requireAdmin } from "@/lib/supabase/server";
import { dakarDate } from "@/lib/time";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Vehicle } from "@/lib/types";

const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthLabel = (m: string) => `${MONTHS_FR[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR")} %`);

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "gold" | "red" | "green" }) {
  const color = tone === "red" ? "text-rose-700" : tone === "green" ? "text-emerald-700" : tone === "gold" ? "gold-text" : "";
  return (
    <div className="bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

export default async function FinancesPage({ searchParams }: { searchParams: Promise<{ mois?: string; vehicule?: string }> }) {
  const { supabase } = (await requireAdmin())!;
  const sp = await searchParams;
  const current = dakarDate(Date.now()).slice(0, 7);
  const month = sp.mois && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : current;
  const vehicleFilter = sp.vehicule || null;

  const [vRes, bRes, eRes, iRes] = await Promise.all([
    supabase.from("luxus_vehicles").select("*").order("created_at"),
    supabase.from("luxus_bookings").select("start_at, status, final_price, estimated_price, vehicle_id, distance_km").eq("status", "completed"),
    supabase.from("luxus_expenses").select("spent_on, amount, category, vehicle_id"),
    supabase.from("luxus_incomes").select("earned_on, amount, trips, vehicle_id"),
  ]);
  const vehicles = (vRes.data ?? []) as Vehicle[];
  const data: FinData = { bookings: bRes.data ?? [], expenses: eRes.data ?? [], incomes: iRes.data ?? [] };
  // Avec un seul véhicule, tout ce qui n'est pas attribué lui revient
  const activeVehicles = vehicles.filter((v) => v.active);
  const defaultVehicle = activeVehicles.length === 1 ? activeVehicles[0].id : null;

  const [from, to] = monthRange(month);
  const s = summarize(data, from, to, vehicleFilter, defaultVehicle);
  const prevMonth = lastMonths(month, 2)[0];
  const sp2 = summarize(data, ...monthRange(prevMonth), vehicleFilter, defaultVehicle);
  const yearStart = `${month.slice(0, 4)}-01-01`;
  const ytd = summarize(data, yearStart, to, vehicleFilter, defaultVehicle);
  const series = monthly(data, lastMonths(month, 6), vehicleFilter, defaultVehicle);
  const maxBar = Math.max(1, ...series.flatMap((m) => [m.revenue, m.expenses]));
  const delta = sp2.profit !== 0 ? Math.round(((s.profit - sp2.profit) / Math.abs(sp2.profit)) * 100) : null;

  const cats = (Object.entries(s.byCategory) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]);

  const perVehicle = vehicles.map((v) => {
    const m = summarize(data, from, to, v.id, defaultVehicle);
    const all = summarize(data, "2000-01-01", "2999-12-31", v.id, defaultVehicle);
    const since = v.purchase_date ?? v.created_at.slice(0, 10);
    const monthsActive = Math.max(1, lastMonthsBetween(since.slice(0, 7), current));
    return {
      v,
      m,
      all,
      payback: paybackPercent(v.purchase_price, all.profit),
      monthsLeft: monthsToPayback(v.purchase_price, all.profit, all.profit / monthsActive),
    };
  });

  const nav = (m: string) => `/admin/finances?mois=${m}${vehicleFilter ? `&vehicule=${vehicleFilter}` : ""}`;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Tableau de bord</p>
        <h1 className="font-brand mt-1 text-2xl">Finances</h1>
      </div>

      <form className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]" action="/admin/finances">
        <div>
          <label className="label" htmlFor="mois">Mois</label>
          <input id="mois" type="month" name="mois" defaultValue={month} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="vehicule">Véhicule</label>
          <select id="vehicule" name="vehicule" defaultValue={vehicleFilter ?? ""} className="input">
            <option value="">Tous</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <button className="btn-primary col-span-2 self-end sm:col-span-1">Afficher</button>
      </form>
      <p className="-mt-6 flex justify-between text-sm">
        <Link href={nav(prevMonth)} className="underline underline-offset-4">← {monthLabel(prevMonth)}</Link>
        {month !== current && <Link href={nav(current)} className="underline underline-offset-4">Mois en cours</Link>}
      </p>

      <section aria-label="Indicateurs du mois">
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em]">{monthLabel(month)}</h2>
        <div className="cells grid-cols-2 sm:grid-cols-4">
          <Kpi label="Chiffre d'affaires" value={formatFcfa(s.revenue)} sub={`Site ${formatFcfa(s.revenueSite)} · Autres ${formatFcfa(s.revenueOther)}`} tone="gold" />
          <Kpi label="Dépenses" value={formatFcfa(s.expenses)} />
          <Kpi label="Bénéfice" value={formatFcfa(s.profit)} tone={s.profit < 0 ? "red" : "green"}
            sub={delta === null ? undefined : `${delta >= 0 ? "+" : ""}${delta} % vs ${monthLabel(prevMonth)}`} />
          <Kpi label="Marge" value={pct(s.margin)} />
          <Kpi label="Courses" value={String(s.trips)} />
          <Kpi label="Kilomètres (site)" value={`${s.km.toLocaleString("fr-FR")} km`} />
          <Kpi label="Recette / km" value={s.revenuePerKm === null ? "—" : formatFcfa(s.revenuePerKm)} />
          <Kpi label="Coût / km" value={s.costPerKm === null ? "—" : formatFcfa(s.costPerKm)} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Depuis le 1er janvier : CA {formatFcfa(ytd.revenue)} · dépenses {formatFcfa(ytd.expenses)} · bénéfice{" "}
          <strong className={ytd.profit < 0 ? "text-rose-700" : "text-emerald-700"}>{formatFcfa(ytd.profit)}</strong>
        </p>
      </section>

      <section aria-labelledby="evo">
        <h2 id="evo" className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em]">6 derniers mois</h2>
        <div className="border border-line p-4">
          <div className="flex h-44 items-end gap-3">
            {series.map((m) => (
              <div key={m.month} className="flex h-full flex-1 flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-1">
                  <div title={`CA ${formatFcfa(m.revenue)}`} className="w-1/2 max-w-6 bg-gold-grad" style={{ height: `${(m.revenue / maxBar) * 100}%` }} />
                  <div title={`Dépenses ${formatFcfa(m.expenses)}`} className="w-1/2 max-w-6 bg-ink" style={{ height: `${(m.expenses / maxBar) * 100}%` }} />
                </div>
                <p className="mt-2 text-center text-[10px] uppercase text-neutral-500">{monthLabel(m.month).split(" ")[0]}</p>
                <p className={`text-center text-[10px] font-semibold tabular-nums ${m.profit < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {m.profit >= 0 ? "+" : ""}{Math.round(m.profit / 1000)}k
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-xs text-neutral-600">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-gold-grad" /> Chiffre d&apos;affaires</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-ink" /> Dépenses</span>
            <span>Chiffre du bas : bénéfice (milliers FCFA)</span>
          </p>
        </div>
        <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[22rem] text-[13px] tabular-nums sm:text-sm">
          <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.08em] text-neutral-500"><th className="py-2">Mois</th><th className="text-right">CA</th><th className="text-right">Dépenses</th><th className="text-right">Bénéfice</th></tr></thead>
          <tbody>
            {series.map((m) => (
              <tr key={m.month} className="border-b border-line">
                <td className="py-2"><Link href={nav(m.month)} className="underline-offset-4 hover:underline">{monthLabel(m.month)}</Link></td>
                <td className="text-right">{formatFcfa(m.revenue)}</td>
                <td className="text-right">{formatFcfa(m.expenses)}</td>
                <td className={`text-right font-semibold ${m.profit < 0 ? "text-rose-700" : ""}`}>{formatFcfa(m.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em]">Dépenses par catégorie — {monthLabel(month)}</h2>
        {cats.length === 0 && <p className="text-sm text-neutral-500">Aucune dépense ce mois-ci. <Link href="/admin/depenses" className="underline">Ajouter une dépense</Link></p>}
        <ul className="space-y-2">
          {cats.map(([c, v]) => (
            <li key={c}>
              <div className="flex justify-between text-sm"><span>{EXPENSE_CATEGORIES[c]}</span><span className="tabular-nums font-semibold">{formatFcfa(v)}</span></div>
              <div className="mt-1 h-1.5 bg-neutral-100"><div className="h-full bg-ink" style={{ width: `${(v / s.expenses) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="veh">
        <h2 id="veh" className="mb-3 text-[13px] font-bold uppercase tracking-[0.07em]">Rentabilité par véhicule</h2>
        <div className="space-y-3">
          {perVehicle.map(({ v, m, all, payback, monthsLeft }) => (
            <div key={v.id} className="border border-line p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-brand text-[15px]">{v.name}</p>
                <p className="text-xs text-neutral-500">{[v.model, v.plate].filter(Boolean).join(" · ") || (v.active ? "Actif" : "Inactif")}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm tabular-nums">
                <div><p className="text-[10px] uppercase text-neutral-500">CA du mois</p><p className="font-semibold">{formatFcfa(m.revenue)}</p></div>
                <div><p className="text-[10px] uppercase text-neutral-500">Dépenses</p><p className="font-semibold">{formatFcfa(m.expenses)}</p></div>
                <div><p className="text-[10px] uppercase text-neutral-500">Bénéfice</p><p className={`font-semibold ${m.profit < 0 ? "text-rose-700" : "text-emerald-700"}`}>{formatFcfa(m.profit)}</p></div>
              </div>
              <p className="mt-3 text-xs text-neutral-600">Depuis le début : bénéfice {formatFcfa(all.profit)} sur {all.trips} courses.</p>
              {payback !== null ? (
                <div className="mt-2">
                  <div className="flex justify-between text-xs"><span>Véhicule remboursé à {payback.toLocaleString("fr-FR")} % ({formatFcfa(v.purchase_price!)})</span>
                    <span>{monthsLeft === 0 ? "Remboursé" : monthsLeft === null ? "—" : `≈ ${monthsLeft} mois restants`}</span></div>
                  <div className="mt-1 h-1.5 bg-neutral-100"><div className="h-full bg-gold-grad" style={{ width: `${payback}%` }} /></div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">Indiquez le prix d&apos;achat dans <Link href="/admin/flotte" className="underline">Flotte</Link> pour suivre le remboursement du véhicule.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-neutral-500">
        Chiffre d&apos;affaires = courses du site terminées (prix payé, sinon prix estimé) + revenus saisis (Yango, courses
        directes…). Dépenses = toutes les dépenses saisies ou scannées. Sans véhicule précisé, une recette ou une dépense est
        attribuée au véhicule unique s&apos;il n&apos;y en a qu&apos;un.
      </p>
    </div>
  );
}

function lastMonthsBetween(fromMonth: string, toMonth: string): number {
  const [y1, m1] = fromMonth.split("-").map(Number);
  const [y2, m2] = toMonth.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}
