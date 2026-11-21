import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lastMonths, monthRange, monthsToPayback, paybackPercent, summarize, type FinData, type Summary } from "./finance";
import { dakarDate } from "./time";
import type { Booking, Expense, Income, Vehicle } from "./types";

export interface ReportPeriod {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  label: string;
}

export function presetPeriods(today: string): { key: string; period: ReportPeriod }[] {
  const month = today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const prev = lastMonths(month, 2)[0];
  const q = Math.floor((m - 1) / 3);
  const qStart = `${y}-${String(q * 3 + 1).padStart(2, "0")}-01`;
  const last12 = lastMonths(month, 12)[0];
  return [
    { key: "mois", period: { from: `${month}-01`, to: today, label: "Mois en cours" } },
    { key: "mois-precedent", period: { from: monthRange(prev)[0], to: monthRange(prev)[1], label: "Mois précédent" } },
    { key: "trimestre", period: { from: qStart, to: today, label: `Trimestre ${q + 1} ${y}` } },
    { key: "annee", period: { from: `${y}-01-01`, to: today, label: `Année ${y}` } },
    { key: "12-mois", period: { from: `${last12}-01`, to: today, label: "12 derniers mois" } },
  ];
}

/** Mois « YYYY-MM » couverts par une période. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [y2, m2] = to.slice(0, 7).split("-").map(Number);
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (out.length > 60) break;
  }
  return out;
}

export interface ReportData {
  period: ReportPeriod;
  generatedAt: string;
  vehicles: Vehicle[];
  bookings: Booking[]; // de la période
  expenses: Expense[]; // de la période
  incomes: Income[]; // de la période
  summary: Summary;
  monthly: { month: string; revenueSite: number; revenueOther: number; revenue: number; expenses: number; profit: number; margin: number | null; trips: number }[];
  perVehicle: { vehicle: Vehicle; period: Summary; allTime: Summary; payback: number | null; monthsLeft: number | null }[];
  activity: {
    requested: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number | null;
    avgTicket: number | null;
    avgDistance: number | null;
    payments: Record<string, number>;
  };
  incomeBySource: Record<string, number>;
}

export async function loadReport(supabase: SupabaseClient, period: ReportPeriod, vehicleId: string | null = null): Promise<ReportData> {
  const [vRes, bRes, eRes, iRes] = await Promise.all([
    supabase.from("luxus_vehicles").select("*").order("created_at"),
    supabase.from("luxus_bookings").select("*").order("start_at"),
    supabase.from("luxus_expenses").select("*").order("spent_on"),
    supabase.from("luxus_incomes").select("*").order("earned_on"),
  ]);
  const vehicles = (vRes.data ?? []) as Vehicle[];
  const allBookings = (bRes.data ?? []) as Booking[];
  const allExpenses = (eRes.data ?? []) as Expense[];
  const allIncomes = (iRes.data ?? []) as Income[];
  const active = vehicles.filter((v) => v.active);
  const def = active.length === 1 ? active[0].id : null;
  const data: FinData = { bookings: allBookings, expenses: allExpenses, incomes: allIncomes };
  const { from, to } = period;
  const inP = (d: string) => d >= from && d <= to;
  const vOk = (id: string | null) => vehicleId === null || (id ?? def) === vehicleId;

  const bookings = allBookings.filter((b) => inP(dakarDate(Date.parse(b.start_at))) && vOk(b.vehicle_id));
  const expenses = allExpenses.filter((e) => inP(e.spent_on) && vOk(e.vehicle_id));
  const incomes = allIncomes.filter((i) => inP(i.earned_on) && vOk(i.vehicle_id));
  const summary = summarize(data, from, to, vehicleId, def);

  const monthly = monthsBetween(from, to).map((month) => {
    const [a, b] = monthRange(month);
    const s = summarize(data, a < from ? from : a, b > to ? to : b, vehicleId, def);
    return { month, revenueSite: s.revenueSite, revenueOther: s.revenueOther, revenue: s.revenue, expenses: s.expenses, profit: s.profit, margin: s.margin, trips: s.trips };
  });

  const today = dakarDate(Date.now());
  const perVehicle = vehicles
    .filter((v) => vehicleId === null || v.id === vehicleId)
    .map((v) => {
      const p = summarize(data, from, to, v.id, def);
      const all = summarize(data, "2000-01-01", "2999-12-31", v.id, def);
      const since = (v.purchase_date ?? v.created_at.slice(0, 10)).slice(0, 7);
      const months = Math.max(1, monthsBetween(`${since}-01`, today).length);
      return { vehicle: v, period: p, allTime: all, payback: paybackPercent(v.purchase_price, all.profit), monthsLeft: monthsToPayback(v.purchase_price, all.profit, all.profit / months) };
    });

  const completed = bookings.filter((b) => b.status === "completed");
  const payments: Record<string, number> = {};
  for (const b of completed) {
    const k = b.payment_method ?? "non_renseigne";
    payments[k] = (payments[k] ?? 0) + (b.final_price ?? b.estimated_price);
  }
  for (const i of incomes) {
    const k = i.payment_method ?? "non_renseigne";
    payments[k] = (payments[k] ?? 0) + i.amount;
  }
  const decided = bookings.filter((b) => ["completed", "cancelled", "no_show"].includes(b.status)).length;
  const incomeBySource: Record<string, number> = { site: summary.revenueSite };
  for (const i of incomes) incomeBySource[i.source] = (incomeBySource[i.source] ?? 0) + i.amount;

  return {
    period,
    generatedAt: new Date().toISOString(),
    vehicles,
    bookings,
    expenses,
    incomes,
    summary,
    monthly,
    perVehicle,
    activity: {
      requested: bookings.length,
      completed: completed.length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      noShow: bookings.filter((b) => b.status === "no_show").length,
      completionRate: decided ? Math.round((completed.length / decided) * 1000) / 10 : null,
      avgTicket: completed.length ? Math.round(summary.revenueSite / completed.length) : null,
      avgDistance: completed.length ? Math.round((completed.reduce((s, b) => s + Number(b.distance_km), 0) / completed.length) * 10) / 10 : null,
      payments,
    },
    incomeBySource,
  };
}

export function parsePeriod(sp: { du?: string; au?: string; periode?: string }, today: string): ReportPeriod {
  const presets = presetPeriods(today);
  const preset = presets.find((p) => p.key === sp.periode);
  if (preset) return preset.period;
  const ok = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (ok(sp.du) && ok(sp.au) && sp.du! <= sp.au!) return { from: sp.du!, to: sp.au!, label: "Période personnalisée" };
  return presets.find((p) => p.key === "annee")!.period;
}
