import { dakarDate } from "./time";
import type { BookingStatus, ExpenseCategory } from "./types";

export interface FinBooking {
  start_at: string;
  status: BookingStatus;
  final_price: number | null;
  estimated_price: number;
  vehicle_id: string | null;
  distance_km: number | string;
}
export interface FinExpense {
  spent_on: string;
  amount: number;
  category: ExpenseCategory;
  vehicle_id: string | null;
}
export interface FinIncome {
  earned_on: string;
  amount: number;
  trips: number;
  vehicle_id: string | null;
}
export interface FinData {
  bookings: FinBooking[];
  expenses: FinExpense[];
  incomes: FinIncome[];
}

/** Recette d'une course du site : prix payé, sinon prix estimé ; seulement si terminée. */
export function bookingRevenue(b: FinBooking): number {
  return b.status === "completed" ? (b.final_price ?? b.estimated_price) : 0;
}

/** Attribue au véhicule par défaut ce qui n'a pas de véhicule (cas d'un seul véhicule). */
function veh(id: string | null, fallback: string | null) {
  return id ?? fallback;
}

export interface Summary {
  revenue: number;
  revenueSite: number;
  revenueOther: number;
  expenses: number;
  profit: number;
  margin: number | null; // %
  trips: number;
  km: number;
  revenuePerKm: number | null;
  costPerKm: number | null;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

/**
 * Synthèse sur [from, to] (dates « YYYY-MM-DD » de Dakar, bornes incluses),
 * éventuellement pour un seul véhicule.
 */
export function summarize(
  d: FinData,
  from: string,
  to: string,
  vehicleId: string | null = null,
  defaultVehicle: string | null = null,
): Summary {
  const inRange = (day: string) => day >= from && day <= to;
  const okVeh = (id: string | null) => vehicleId === null || veh(id, defaultVehicle) === vehicleId;

  let revenueSite = 0, trips = 0, km = 0;
  for (const b of d.bookings) {
    if (b.status !== "completed" || !okVeh(b.vehicle_id) || !inRange(dakarDate(Date.parse(b.start_at)))) continue;
    revenueSite += bookingRevenue(b);
    trips += 1;
    km += Number(b.distance_km) || 0;
  }
  let revenueOther = 0;
  for (const i of d.incomes) {
    if (!okVeh(i.vehicle_id) || !inRange(i.earned_on)) continue;
    revenueOther += i.amount;
    trips += i.trips;
  }
  let expenses = 0;
  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  for (const e of d.expenses) {
    if (!okVeh(e.vehicle_id) || !inRange(e.spent_on)) continue;
    expenses += e.amount;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const revenue = revenueSite + revenueOther;
  const profit = revenue - expenses;
  km = Math.round(km * 10) / 10;
  return {
    revenue,
    revenueSite,
    revenueOther,
    expenses,
    profit,
    margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
    trips,
    km,
    revenuePerKm: km > 0 ? Math.round(revenueSite / km) : null,
    costPerKm: km > 0 ? Math.round(expenses / km) : null,
    byCategory,
  };
}

/** Liste des mois « YYYY-MM » se terminant par `lastMonth`, du plus ancien au plus récent. */
export function lastMonths(lastMonth: string, count: number): string[] {
  const [y, m] = lastMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Premier et dernier jour d'un mois « YYYY-MM ». */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, "0")}`];
}

export function monthly(d: FinData, months: string[], vehicleId: string | null = null, defaultVehicle: string | null = null) {
  return months.map((month) => {
    const [from, to] = monthRange(month);
    const s = summarize(d, from, to, vehicleId, defaultVehicle);
    return { month, revenue: s.revenue, expenses: s.expenses, profit: s.profit };
  });
}

/** Part du prix d'achat déjà remboursée par le bénéfice cumulé (en %, plafonnée à 100). */
export function paybackPercent(purchasePrice: number | null, cumulativeProfit: number): number | null {
  if (!purchasePrice || purchasePrice <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((cumulativeProfit / purchasePrice) * 1000) / 10));
}

/** Nombre de mois restants pour rembourser le véhicule au rythme du bénéfice mensuel moyen. */
export function monthsToPayback(purchasePrice: number | null, cumulativeProfit: number, avgMonthlyProfit: number): number | null {
  if (!purchasePrice || purchasePrice <= 0) return null;
  const left = purchasePrice - cumulativeProfit;
  if (left <= 0) return 0;
  if (avgMonthlyProfit <= 0) return null;
  return Math.ceil(left / avgMonthlyProfit);
}
