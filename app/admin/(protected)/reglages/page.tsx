import ConfirmButton from "@/components/admin/ConfirmButton";
import { FixedCostForm, LoanForm } from "@/components/admin/FleetForms";
import SettingsForm from "@/components/admin/SettingsForm";
import { deleteFixedCost } from "../../actions";
import { fcfa } from "@/lib/fleet";
import { requireAdmin } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, FIXED_COST_KINDS, type FixedCost, type Loan, type Settings, type Vehicle } from "@/lib/types";

export default async function SettingsPage() {
  const { supabase } = (await requireAdmin())!;
  const [sRes, vRes, fRes, lRes] = await Promise.all([
    supabase.from("luxus_settings").select("*").single(),
    supabase.from("luxus_vehicles").select("*").order("created_at"),
    supabase.from("luxus_fixed_costs").select("*").order("created_at"),
    supabase.from("luxus_loans").select("*").order("created_at"),
  ]);
  const vehicles = (vRes.data ?? []) as Vehicle[];
  const costs = (fRes.data ?? []) as FixedCost[];
  const loans = (lRes.data ?? []) as Loan[];
  const vName = (id: string | null) => vehicles.find((v) => v.id === id)?.name ?? "Toute la flotte";
  const inResult = costs.filter((c) => c.active && c.in_result).reduce((t, c) => t + c.monthly_amount, 0);

  return (
    <div className="space-y-8">
      <h1 className="font-brand text-2xl">Réglages</h1>

      <section className="space-y-3" aria-labelledby="fixes">
        <h2 id="fixes" className="text-[13px] font-bold uppercase tracking-[0.07em]">Charges fixes mensuelles</h2>
        <p className="text-sm text-neutral-600">
          Déduites du résultat au prorata des jours ouvrés. L&apos;amortissement n&apos;apparaît que dans les états financiers.
          Total dans le résultat : <strong>{fcfa(inResult)}</strong> par mois.
        </p>
        <ul className="divide-y divide-line border-y border-line">
          {costs.map((c) => (
            <li key={c.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{c.label} {!c.active && <span className="text-xs font-normal text-neutral-500">(désactivée)</span>}</p>
                    <p className="text-[11px] text-neutral-500">{FIXED_COST_KINDS[c.kind]} · {vName(c.vehicle_id)}{c.in_result ? "" : " · états financiers uniquement"}</p>
                  </div>
                  <p className="shrink-0 text-[14px] font-bold tabular-nums">{fcfa(c.monthly_amount)}</p>
                  <span className="text-[11px] font-semibold uppercase text-gold-dark">Modifier</span>
                </summary>
                <div className="mt-3 space-y-3">
                  <FixedCostForm c={c} vehicles={vehicles} />
                  <form action={deleteFixedCost}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message={`Supprimer la charge « ${c.label} » ?`} className="text-sm text-rose-700 underline underline-offset-4">Supprimer cette charge</ConfirmButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="border border-line p-3">
          <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-[0.05em]">+ Ajouter une charge fixe</summary>
          <div className="mt-3"><FixedCostForm vehicles={vehicles} /></div>
        </details>
      </section>

      <section className="space-y-3" aria-labelledby="pret">
        <h2 id="pret" className="text-[13px] font-bold uppercase tracking-[0.07em]">Prêt</h2>
        {loans.map((l) => (
          <div key={l.id} className="border border-line p-4">
            {(!l.principal || !l.first_due_on) && (
              <p className="alert-info mb-3">À compléter : le capital emprunté et la date de la 1re échéance, pour calculer le tableau d&apos;amortissement (intérêts / capital).</p>
            )}
            <LoanForm l={l} vehicles={vehicles} />
          </div>
        ))}
        {loans.length === 0 && <div className="border border-line p-4"><LoanForm vehicles={vehicles} /></div>}
      </section>

      <section className="space-y-3" aria-labelledby="site">
        <h2 id="site" className="text-[13px] font-bold uppercase tracking-[0.07em]">Site de réservation</h2>
        <SettingsForm s={{ ...DEFAULT_SETTINGS, ...(sRes.data as Settings | null) }} />
      </section>
    </div>
  );
}
