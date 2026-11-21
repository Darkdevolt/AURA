import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import EntryForm from "@/components/admin/EntryForm";
import { deleteEntry } from "../../actions";
import { monthRange, lastMonths } from "@/lib/finance";
import { formatFcfa } from "@/lib/pricing";
import { scanEnabled } from "@/lib/scan";
import { requireAdmin } from "@/lib/supabase/server";
import { dakarDate, formatDateLong } from "@/lib/time";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, MONEY_LABELS, type Expense, type Income, type Vehicle } from "@/lib/types";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { supabase } = (await requireAdmin())!;
  const sp = await searchParams;
  const today = dakarDate(Date.now());
  const month = sp.mois && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : today.slice(0, 7);
  const [from, to] = monthRange(month);

  const [vRes, eRes, iRes] = await Promise.all([
    supabase.from("luxus_vehicles").select("*").order("created_at"),
    supabase.from("luxus_expenses").select("*").gte("spent_on", from).lte("spent_on", to).order("spent_on", { ascending: false }),
    supabase.from("luxus_incomes").select("*").gte("earned_on", from).lte("earned_on", to).order("earned_on", { ascending: false }),
  ]);
  const vehicles = (vRes.data ?? []) as Vehicle[];
  const vName = (id: string | null) => vehicles.find((x) => x.id === id)?.name ?? "Général";
  type Row = { kind: "depense" | "revenu"; id: string; date: string; label: string; detail: string; amount: number; receipt: string | null };
  const rows: Row[] = [
    ...((eRes.data ?? []) as Expense[]).map((e) => ({
      kind: "depense" as const, id: e.id, date: e.spent_on, amount: e.amount, receipt: e.receipt_path,
      label: EXPENSE_CATEGORIES[e.category],
      detail: [e.supplier, vName(e.vehicle_id), e.payment_method && MONEY_LABELS[e.payment_method], e.note, e.source === "scan" ? "scanné" : null].filter(Boolean).join(" · "),
    })),
    ...((iRes.data ?? []) as Income[]).map((i) => ({
      kind: "revenu" as const, id: i.id, date: i.earned_on, amount: i.amount, receipt: i.receipt_path,
      label: INCOME_SOURCES[i.source],
      detail: [`${i.trips} course${i.trips > 1 ? "s" : ""}`, vName(i.vehicle_id), i.payment_method && MONEY_LABELS[i.payment_method], i.note].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const paths = rows.map((r) => r.receipt).filter((p): p is string => !!p);
  const signed = paths.length ? (await supabase.storage.from("luxus-receipts").createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlOf = (p: string | null) => (p ? signed.find((s) => s.path === p)?.signedUrl ?? undefined : undefined);
  const totalIn = rows.filter((r) => r.kind === "revenu").reduce((s, r) => s + r.amount, 0);
  const totalOut = rows.filter((r) => r.kind === "depense").reduce((s, r) => s + r.amount, 0);
  const prev = lastMonths(month, 2)[0];
  const next = (() => { const [y, m] = month.split("-").map(Number); const d = new Date(Date.UTC(y, m, 1)); return d.toISOString().slice(0, 7); })();
  const days = [...rows.reduce((map, r) => map.set(r.date, [...(map.get(r.date) ?? []), r]), new Map<string, Row[]>())];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Saisie</p>
        <h1 className="font-brand mt-1 text-2xl">Dépenses &amp; revenus</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Les courses réservées sur le site sont comptées automatiquement. Ajoutez ici tout le reste : recharges, entretien,
          salaire, assurance… et vos revenus hors site (Yango, clients directs).
        </p>
      </div>

      <EntryForm vehicles={vehicles} today={today} scanEnabled={scanEnabled()} />

      <section aria-labelledby="journal">
        <div className="flex items-baseline justify-between">
          <h2 id="journal" className="text-[13px] font-bold uppercase tracking-[0.07em]">Journal — <span className="capitalize">{monthLabel(month)}</span></h2>
          <div className="flex gap-1">
            <Link href={`/admin/depenses?mois=${prev}`} className="chip chip-off h-10 w-10 border border-line" aria-label="Mois précédent">←</Link>
            {next <= today.slice(0, 7) && <Link href={`/admin/depenses?mois=${next}`} className="chip chip-off h-10 w-10 border border-line" aria-label="Mois suivant">→</Link>}
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Revenus saisis <strong>{formatFcfa(totalIn)}</strong> · Dépenses <strong>{formatFcfa(totalOut)}</strong> ·{" "}
          <Link href={`/admin/finances?mois=${month}`} className="underline underline-offset-4">voir le bilan</Link>
        </p>
        {rows.length === 0 && <p className="mt-4 text-sm text-neutral-500">Rien de saisi ce mois-ci.</p>}
        {/* Une ligne par jour (totaux), le détail s'ouvre d'un toucher */}
        <div className="mt-3 border-t border-line">
          {days.map(([day, list], idx) => {
            const inn = list.filter((r) => r.kind === "revenu").reduce((t, r) => t + r.amount, 0);
            const out = list.filter((r) => r.kind === "depense").reduce((t, r) => t + r.amount, 0);
            return (
              <details key={day} open={idx === 0} className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold capitalize">{formatDateLong(Date.parse(`${day}T12:00:00Z`))}</p>
                    <p className="text-[11px] text-neutral-500">{list.length} ligne{list.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right text-[12px] tabular-nums leading-tight">
                    {inn > 0 && <p className="font-semibold text-emerald-700">+{formatFcfa(inn)}</p>}
                    {out > 0 && <p className="font-semibold">−{formatFcfa(out)}</p>}
                  </div>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden className="shrink-0 text-neutral-400 transition group-open:rotate-180"><path d="M6 9l6 6 6-6" /></svg>
                </summary>
                <ul className="divide-y divide-line border-t border-line bg-neutral-50/60">
                  {list.map((r) => (
                    <li key={r.kind + r.id} className="flex items-center gap-2 py-2 pl-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">{r.label}</p>
                        <p className="line-clamp-2 text-[11px] text-neutral-500">{r.detail.replace(/\[Import Excel\]\s*/g, "")}</p>
                      </div>
                      {urlOf(r.receipt) && (
                        <a href={urlOf(r.receipt)} target="_blank" rel="noopener noreferrer" className="text-[11px] underline underline-offset-4">Reçu</a>
                      )}
                      <p className={`shrink-0 text-[13px] font-semibold tabular-nums ${r.kind === "revenu" ? "text-emerald-700" : ""}`}>
                        {r.kind === "revenu" ? "+" : "−"}{formatFcfa(r.amount)}
                      </p>
                      <form action={deleteEntry}>
                        <input type="hidden" name="kind" value={r.kind} />
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton message={`Supprimer « ${r.label} » de ${formatFcfa(r.amount)} ?`} label="Supprimer" className="flex h-10 w-9 items-center justify-center text-lg leading-none text-neutral-400 hover:text-rose-700">×</ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
