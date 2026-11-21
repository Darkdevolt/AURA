import { describe, expect, it } from "vitest";
import { lastMonths, monthRange, monthly, monthsToPayback, paybackPercent, summarize, type FinData } from "@/lib/finance";

const V1 = "v1", V2 = "v2";
const data: FinData = {
  bookings: [
    { start_at: "2026-11-03T10:00:00Z", status: "completed", final_price: 5000, estimated_price: 4500, vehicle_id: V1, distance_km: 10 },
    { start_at: "2026-11-04T10:00:00Z", status: "completed", final_price: null, estimated_price: 3000, vehicle_id: null, distance_km: "6.5" },
    { start_at: "2026-11-05T10:00:00Z", status: "cancelled", final_price: null, estimated_price: 9999, vehicle_id: V1, distance_km: 20 },
    { start_at: "2026-11-06T10:00:00Z", status: "completed", final_price: 7000, estimated_price: 7000, vehicle_id: V2, distance_km: 14 },
    { start_at: "2026-10-30T10:00:00Z", status: "completed", final_price: 2000, estimated_price: 2000, vehicle_id: V1, distance_km: 4 },
  ],
  incomes: [{ earned_on: "2026-11-10", amount: 15000, trips: 6, vehicle_id: V1 }],
  expenses: [
    { spent_on: "2026-11-02", amount: 4000, category: "recharge", vehicle_id: V1 },
    { spent_on: "2026-11-15", amount: 6000, category: "entretien", vehicle_id: null },
    { spent_on: "2026-11-20", amount: 1000, category: "recharge", vehicle_id: V2 },
    { spent_on: "2026-12-01", amount: 99999, category: "assurance", vehicle_id: V1 },
  ],
};

describe("summarize", () => {
  it("additionne courses terminées, revenus hors site et dépenses du mois", () => {
    const s = summarize(data, "2026-11-01", "2026-11-30");
    expect(s.revenueSite).toBe(5000 + 3000 + 7000);
    expect(s.revenueOther).toBe(15000);
    expect(s.revenue).toBe(30000);
    expect(s.expenses).toBe(11000);
    expect(s.profit).toBe(19000);
    expect(s.margin).toBe(63.3);
    expect(s.trips).toBe(3 + 6);
    expect(s.km).toBe(30.5);
    expect(s.byCategory).toEqual({ recharge: 5000, entretien: 6000 });
  });

  it("filtre par véhicule et attribue le « sans véhicule » au véhicule par défaut", () => {
    const s = summarize(data, "2026-11-01", "2026-11-30", V1, V1);
    expect(s.revenue).toBe(5000 + 3000 + 15000);
    expect(s.expenses).toBe(4000 + 6000);
    const s2 = summarize(data, "2026-11-01", "2026-11-30", V2, V1);
    expect(s2.revenue).toBe(7000);
    expect(s2.expenses).toBe(1000);
  });

  it("gère un mois vide", () => {
    const s = summarize(data, "2027-01-01", "2027-01-31");
    expect(s).toMatchObject({ revenue: 0, expenses: 0, profit: 0, margin: null, revenuePerKm: null });
  });
});

describe("mois", () => {
  it("lastMonths et monthRange", () => {
    expect(lastMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(monthRange("2026-02")).toEqual(["2026-02-01", "2026-02-28"]);
    expect(monthRange("2028-02")).toEqual(["2028-02-01", "2028-02-29"]);
  });
  it("monthly", () => {
    const m = monthly(data, ["2026-10", "2026-11"]);
    expect(m[0]).toEqual({ month: "2026-10", revenue: 2000, expenses: 0, profit: 2000 });
    expect(m[1].profit).toBe(19000);
  });
});

describe("remboursement du véhicule", () => {
  it("pourcentage et mois restants", () => {
    expect(paybackPercent(10_000_000, 2_500_000)).toBe(25);
    expect(paybackPercent(null, 1000)).toBeNull();
    expect(paybackPercent(1000, 5000)).toBe(100);
    expect(monthsToPayback(10_000_000, 2_500_000, 500_000)).toBe(15);
    expect(monthsToPayback(10_000_000, 2_500_000, 0)).toBeNull();
    expect(monthsToPayback(1000, 2000, 10)).toBe(0);
  });
});
