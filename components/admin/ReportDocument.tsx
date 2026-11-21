import Logo from "@/components/Logo";
import { formatFcfa } from "@/lib/pricing";
import type { ReportData } from "@/lib/report";
import { dakarDate, dakarTime } from "@/lib/time";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, MONEY_LABELS, type ExpenseCategory } from "@/lib/types";

const MONTHS_FR = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const monthLabel = (m: string) => `${MONTHS_FR[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`;
const frDate = (d: string) => d.split("-").reverse().join("/");
const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR")} %`);
const PAY_LABELS: Record<string, string> = { ...MONEY_LABELS, non_renseigne: "Non renseigné" };
const SOURCE_LABELS: Record<string, string> = { site: "Réservations du site", ...INCOME_SOURCES };

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 border-b-2 border-ink pb-1 text-[12px] font-bold uppercase tracking-[0.08em]">{children}</h2>;
}

/** Document « Rapport d'activité » (écran et impression A4). */
export default function ReportDocument({ r, vehName }: { r: ReportData; vehName: string | null }) {
  const period = r.period;
  const s = r.summary;
  const maxBar = Math.max(1, ...r.monthly.flatMap((m) => [m.revenue, m.expenses]));
  const cats = (Object.entries(s.byCategory) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]);
  const generated = Date.parse(r.generatedAt);
  return (
    <>
      {/* Document */}
      <article className="report mx-auto bg-white text-ink print:p-0">
        <header className="flex items-start justify-between gap-4 bg-ink-grad p-6 text-white print:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-light">Rapport d&apos;activité</p>
            <p className="font-brand mt-2 text-xl leading-tight">Luxus <span className="gold-text">Asaad</span></p>
            <p className="mt-1 text-sm text-neutral-300">VTC électrique · Dakar, Sénégal</p>
            <p className="mt-4 text-sm">Période : <strong>{frDate(period.from)} au {frDate(period.to)}</strong>{vehName ? ` · ${vehName}` : ""}</p>
            <p className="text-xs text-neutral-400">Édité le {frDate(dakarDate(generated))} à {dakarTime(generated).replace(":", "h")}</p>
          </div>
          <Logo variant="full" height={96} alt="Luxus Asaad" />
        </header>
        <div aria-hidden className="gold-rule" />

        <div className="space-y-8 p-6 print:px-2">
          <section>
            <H2>Synthèse</H2>
            <div className="cells grid-cols-2 sm:grid-cols-4 print:grid-cols-4">
              {[
                ["Chiffre d'affaires", formatFcfa(s.revenue)],
                ["Dépenses", formatFcfa(s.expenses)],
                ["Résultat", formatFcfa(s.profit)],
                ["Marge", pct(s.margin)],
                ["Courses réalisées", String(s.trips)],
                ["Kilomètres (site)", `${s.km.toLocaleString("fr-FR")} km`],
                ["Recette / km", s.revenuePerKm === null ? "—" : formatFcfa(s.revenuePerKm)],
                ["Panier moyen", r.activity.avgTicket === null ? "—" : formatFcfa(r.activity.avgTicket)],
              ].map(([k, v]) => (
                <div key={k} className="bg-white p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{k}</p>
                  <p className={`mt-1 text-[15px] font-bold tabular-nums ${k === "Résultat" ? (s.profit < 0 ? "text-rose-700" : "text-emerald-700") : ""}`}>{v}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="break-inside-avoid">
            <H2>Évolution mensuelle</H2>
            <div className="flex h-36 items-end gap-0.5 border-b border-line sm:gap-2">
              {r.monthly.map((m) => (
                <div key={m.month} className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5">
                  <div className="w-1/2 max-w-5 bg-gold" style={{ height: `${(m.revenue / maxBar) * 100}%`, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} />
                  <div className="w-1/2 max-w-5 bg-ink" style={{ height: `${(m.expenses / maxBar) * 100}%`, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-0.5 sm:gap-2">
              {r.monthly.map((m) => <p key={m.month} className="min-w-0 flex-1 overflow-hidden text-center text-[8px] text-neutral-500 sm:text-[9px]">{monthLabel(m.month)}</p>)}
            </div>
            <p className="mt-2 flex gap-4 text-[10px] text-neutral-600">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-gold" /> Chiffre d&apos;affaires</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-ink" /> Dépenses</span>
            </p>
            <div className="overflow-x-auto print:overflow-visible"><table className="mt-3 w-full min-w-[30rem] text-[11px] tabular-nums print:min-w-0">
              <thead>
                <tr className="border-b border-ink text-left text-[9px] uppercase tracking-[0.06em] text-neutral-500">
                  <th className="py-1.5">Mois</th><th className="text-right">CA site</th><th className="text-right">Autres</th><th className="text-right">CA total</th><th className="text-right">Dépenses</th><th className="text-right">Résultat</th><th className="text-right">Marge</th>
                </tr>
              </thead>
              <tbody>
                {r.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-line">
                    <td className="py-1.5">{monthLabel(m.month)}</td>
                    <td className="text-right">{formatFcfa(m.revenueSite)}</td>
                    <td className="text-right">{formatFcfa(m.revenueOther)}</td>
                    <td className="text-right font-semibold">{formatFcfa(m.revenue)}</td>
                    <td className="text-right">{formatFcfa(m.expenses)}</td>
                    <td className={`text-right font-semibold ${m.profit < 0 ? "text-rose-700" : ""}`}>{formatFcfa(m.profit)}</td>
                    <td className="text-right">{pct(m.margin)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink font-bold">
                  <td className="py-1.5">Total</td>
                  <td className="text-right">{formatFcfa(s.revenueSite)}</td>
                  <td className="text-right">{formatFcfa(s.revenueOther)}</td>
                  <td className="text-right">{formatFcfa(s.revenue)}</td>
                  <td className="text-right">{formatFcfa(s.expenses)}</td>
                  <td className={`text-right ${s.profit < 0 ? "text-rose-700" : ""}`}>{formatFcfa(s.profit)}</td>
                  <td className="text-right">{pct(s.margin)}</td>
                </tr>
              </tbody>
            </table></div>
          </section>

          <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2">
            <section className="break-inside-avoid">
              <H2>Origine du chiffre d&apos;affaires</H2>
              <ul className="space-y-1.5 text-[12px]">
                {Object.entries(r.incomeBySource).filter(([, v]) => v > 0).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-line pb-1"><span>{SOURCE_LABELS[k] ?? k}</span><span className="tabular-nums font-semibold">{formatFcfa(v)}</span></li>
                ))}
                {s.revenue === 0 && <li className="text-neutral-500">Aucune recette sur la période.</li>}
              </ul>
              <div className="mt-6"><H2>Encaissements par moyen de paiement</H2></div>
              <ul className="space-y-1.5 text-[12px]">
                {Object.entries(r.activity.payments).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-line pb-1"><span>{PAY_LABELS[k] ?? k}</span><span className="tabular-nums font-semibold">{formatFcfa(v)}</span></li>
                ))}
              </ul>
            </section>
            <section className="break-inside-avoid">
              <H2>Dépenses par catégorie</H2>
              <ul className="space-y-1.5 text-[12px]">
                {cats.map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between"><span>{EXPENSE_CATEGORIES[c]}</span><span className="tabular-nums font-semibold">{formatFcfa(v)} <span className="font-normal text-neutral-500">({Math.round((v / s.expenses) * 100)} %)</span></span></div>
                    <div className="mt-0.5 h-1 bg-neutral-100"><div className="h-full bg-ink" style={{ width: `${(v / s.expenses) * 100}%`, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} /></div>
                  </li>
                ))}
                {cats.length === 0 && <li className="text-neutral-500">Aucune dépense sur la période.</li>}
              </ul>
            </section>
          </div>

          <section className="break-inside-avoid">
            <H2>Activité des réservations en ligne</H2>
            <div className="cells grid-cols-3 sm:grid-cols-6 print:grid-cols-6">
              {[
                ["Demandes", r.activity.requested],
                ["Réalisées", r.activity.completed],
                ["Annulées", r.activity.cancelled],
                ["Clients absents", r.activity.noShow],
                ["Taux de réalisation", pct(r.activity.completionRate)],
                ["Distance moyenne", r.activity.avgDistance === null ? "—" : `${r.activity.avgDistance.toLocaleString("fr-FR")} km`],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-white p-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-neutral-500">{k}</p>
                  <p className="mt-0.5 text-[14px] font-bold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="break-inside-avoid">
            <H2>Rentabilité de la flotte</H2>
            <div className="overflow-x-auto print:overflow-visible"><table className="w-full min-w-[30rem] text-[11px] tabular-nums print:min-w-0">
              <thead>
                <tr className="border-b border-ink text-left text-[9px] uppercase tracking-[0.06em] text-neutral-500">
                  <th className="py-1.5">Véhicule</th><th className="text-right">CA période</th><th className="text-right">Dépenses</th><th className="text-right">Résultat</th><th className="text-right">Résultat cumulé</th><th className="text-right">Amorti</th>
                </tr>
              </thead>
              <tbody>
                {r.perVehicle.map(({ vehicle: v, period: p, allTime, payback, monthsLeft }) => (
                  <tr key={v.id} className="border-b border-line align-top">
                    <td className="py-1.5"><strong>{v.name}</strong><br /><span className="text-neutral-500">{[v.model, v.plate].filter(Boolean).join(" · ")}</span></td>
                    <td className="text-right">{formatFcfa(p.revenue)}</td>
                    <td className="text-right">{formatFcfa(p.expenses)}</td>
                    <td className={`text-right font-semibold ${p.profit < 0 ? "text-rose-700" : ""}`}>{formatFcfa(p.profit)}</td>
                    <td className="text-right">{formatFcfa(allTime.profit)}</td>
                    <td className="text-right">{payback === null ? "—" : `${payback.toLocaleString("fr-FR")} %`}{monthsLeft ? <><br /><span className="text-neutral-500">≈ {monthsLeft} mois</span></> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <p className="mt-2 text-[10px] text-neutral-500">« Amorti » : part du prix d&apos;achat déjà couverte par le résultat cumulé du véhicule, et temps restant estimé au rythme moyen actuel.</p>
          </section>

          <footer className="border-t border-line pt-3 text-[9px] leading-relaxed text-neutral-500">
            Chiffre d&apos;affaires = courses réservées sur le site et terminées (prix encaissé, à défaut prix estimé) + revenus
            enregistrés hors site. Dépenses = justificatifs saisis ou scannés. Montants en francs CFA (XOF). Document généré
            automatiquement depuis le système de gestion Luxus Asaad.
          </footer>
        </div>
      </article>
    </>
  );
}
