import Link from "next/link";
import { dayGap, fcfa } from "@/lib/fleet";
import { monthRange, lastMonths } from "@/lib/finance";
import { requireAdmin } from "@/lib/supabase/server";
import { dakarDate } from "@/lib/time";
import type { Balance, CashMove, DayRecord, Expense } from "@/lib/types";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const n = (v: number) => Math.round(v).toLocaleString("fr-FR").replace(/ | /g, " ");

interface Row {
  day: string;
  trips: number;
  cash: number;
  comm: number;
  net: number;
  bonus: number;
  recharges: number;
  others: number;
  topup: number;
  vaultOut: number;
  vaultIn: number;
  gap: number | null;
  notes: string | null;
}

export default async function DaysPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { supabase } = (await requireAdmin())!;
  const sp = await searchParams;
  const today = dakarDate(Date.now());
  const month = sp.mois && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : today.slice(0, 7);
  const [from, to] = monthRange(month);

  const [dRes, eRes, mRes, bRes] = await Promise.all([
    supabase.from("luxus_days").select("*").gte("day", from).lte("day", to).order("day"),
    supabase.from("luxus_expenses").select("*").gte("spent_on", from).lte("spent_on", to),
    supabase.from("luxus_cash_moves").select("*").gte("day", from).lte("day", to).order("day"),
    supabase.from("luxus_balances").select("*").order("at", { ascending: false }),
  ]);
  const days = (dRes.data ?? []) as DayRecord[];
  const expenses = (eRes.data ?? []) as Expense[];
  const moves = (mRes.data ?? []) as CashMove[];
  const balances = (bRes.data ?? []) as Balance[];

  // Une ligne par date ayant de l'activité, une dépense ou un mouvement du coffre
  const dates = [...new Set([...days.map((d) => d.day), ...expenses.map((e) => e.spent_on), ...moves.map((m) => m.day)])].sort();
  const rows: Row[] = dates.map((day) => {
    const d = days.find((x) => x.day === day);
    const ex = expenses.filter((e) => e.spent_on === day);
    const mv = moves.filter((m) => m.day === day && m.account === "coffre");
    const recharges = ex.filter((e) => e.category === "recharge").reduce((t, e) => t + e.amount, 0);
    const others = ex.filter((e) => e.category !== "recharge").reduce((t, e) => t + e.amount, 0);
    const vaultIn = mv.filter((m) => m.direction === "entree" && m.kind === "versement_chauffeur").reduce((t, m) => t + m.amount, 0);
    const vaultOut = mv.filter((m) => m.direction === "sortie" && (m.kind === "envoi_chauffeur" || m.kind === "retrait")).reduce((t, m) => t + m.amount, 0);
    const otherIn = mv.filter((m) => m.direction === "entree" && m.kind !== "versement_chauffeur").reduce((t, m) => t + m.amount, 0);
    return {
      day,
      trips: d?.trips ?? 0,
      cash: d?.cash_collected ?? 0,
      comm: d?.commissions ?? 0,
      net: d?.net_yango ?? 0,
      bonus: d?.bonus ?? 0,
      recharges,
      others,
      topup: d?.yango_topup ?? 0,
      vaultOut,
      vaultIn: vaultIn + otherIn,
      gap: d ? dayGap({ cashCollected: d.cash_collected, recharges, yangoTopup: d.yango_topup, otherExpenses: others, vaultOut, vaultIn }) : null,
      notes: d?.notes ?? mv.map((m) => m.note).filter(Boolean).join(" · ") ?? null,
    };
  });
  const sum = (k: keyof Row) => rows.reduce((t, r) => t + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);

  const vaultCalc = moves.filter((m) => m.account === "coffre").reduce((t, m) => t + (m.direction === "entree" ? m.amount : -m.amount), 0);
  const lastVault = balances.find((b) => b.account === "coffre");
  const lastYango = balances.find((b) => b.account === "yango");
  const prev = lastMonths(month, 2)[0];
  const label = `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

  const cols: [keyof Row, string][] = [
    ["trips", "Courses"], ["cash", "Encaissé"], ["comm", "Commissions"], ["net", "Net Yango"], ["bonus", "Bonus"],
    ["recharges", "Recharges"], ["others", "Autres dép."], ["topup", "Recharge solde Yango"], ["vaultOut", "Sorties du coffre"], ["vaultIn", "Versé au coffre"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Données</p>
          <h1 className="font-brand mt-1 text-2xl">Journées · <span className="capitalize">{label}</span></h1>
        </div>
        <Link href={`/admin/journees?mois=${prev}`} className="chip chip-off h-10 w-10 border border-line" aria-label="Mois précédent">←</Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Courses", n(sum("trips"))],
          ["Encaissé", fcfa(sum("cash"))],
          ["Net Yango", fcfa(sum("net"))],
          ["Recharges", fcfa(sum("recharges"))],
        ].map(([k, v]) => (
          <div key={k} className="border border-line px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{k}</p>
            <p className="mt-0.5 text-[15px] font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[60rem] border-collapse whitespace-nowrap text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-ink text-left text-[10px] uppercase tracking-[0.06em] text-neutral-500">
              <th className="sticky left-0 bg-white py-2 pr-2">Date</th>
              {cols.map(([k, l]) => <th key={k} className="px-2 py-2 text-right">{l}</th>)}
              <th className="px-2 py-2 text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day} className="border-b border-line align-top">
                <td className="sticky left-0 bg-white py-2 pr-2 font-semibold">{r.day.slice(8)}/{r.day.slice(5, 7)}</td>
                {cols.map(([k]) => <td key={k} className="px-2 py-2 text-right">{(r[k] as number) ? n(r[k] as number) : "–"}</td>)}
                <td className={`px-2 py-2 text-right font-semibold ${r.gap === null ? "text-neutral-400" : r.gap === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {r.gap === null ? "–" : n(r.gap)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-ink font-bold">
              <td className="sticky left-0 bg-white py-2 pr-2">Total</td>
              {cols.map(([k]) => <td key={k} className="px-2 py-2 text-right">{n(sum(k))}</td>)}
              <td className="px-2 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-neutral-600">
        Écart = encaissé − recharges − recharge du solde Yango − autres dépenses + sorties du coffre − versé au coffre.
        <span className="text-emerald-700"> 0 = tout est expliqué</span> ; <span className="text-amber-700">sinon : espèces gardées par le chauffeur, versement décalé au lendemain ou dépense non saisie</span>.
      </p>

      <section className="border border-line p-4" aria-labelledby="treso">
        <h2 id="treso" className="text-[13px] font-bold uppercase tracking-[0.07em]">Contrôle du coffre</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
          <div><dt className="text-neutral-500">Coffre calculé (entrées − sorties)</dt><dd className="text-[15px] font-bold tabular-nums">{fcfa(vaultCalc)}</dd></div>
          <div><dt className="text-neutral-500">Dernier solde constaté</dt><dd className="text-[15px] font-bold tabular-nums">{lastVault ? fcfa(lastVault.amount) : "—"}</dd>
            {lastVault && <dd className="text-[11px] text-neutral-500">le {new Date(lastVault.at).toLocaleString("fr-FR", { timeZone: "Africa/Dakar", dateStyle: "short", timeStyle: "short" })}</dd>}</div>
          <div><dt className="text-neutral-500">Écart coffre</dt>
            <dd className={`text-[15px] font-bold tabular-nums ${lastVault && lastVault.amount - vaultCalc === 0 ? "text-emerald-700" : "text-amber-700"}`}>{lastVault ? fcfa(lastVault.amount - vaultCalc) : "—"}</dd></div>
          <div><dt className="text-neutral-500">Solde Yango</dt><dd className="text-[15px] font-bold tabular-nums">{lastYango ? fcfa(lastYango.amount) : "—"}</dd>
            {lastYango && <dd className="text-[11px] text-neutral-500">le {new Date(lastYango.at).toLocaleDateString("fr-FR", { timeZone: "Africa/Dakar" })}</dd>}</div>
        </dl>
      </section>
    </div>
  );
}
