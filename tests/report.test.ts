import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { loadReport, monthsBetween, parsePeriod } from "@/lib/report";
import { buildReportWorkbook } from "@/lib/report-xlsx";
import { fakeSupabase } from "./fixtures";

const period = { from: "2026-09-01", to: "2026-11-30", label: "test" };

describe("rapport", () => {
  it("périodes", () => {
    expect(monthsBetween("2026-11-15", "2027-02-03")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(parsePeriod({ periode: "annee" }, "2026-11-21")).toMatchObject({ from: "2026-01-01", to: "2026-11-21" });
    expect(parsePeriod({ du: "2026-03-01", au: "2026-02-01" }, "2026-11-21").from).toBe("2026-01-01");
  });

  it("calcule synthèse, mois, activité et flotte", async () => {
    const r = await loadReport(fakeSupabase(), period);
    // Site : 8 courses terminées
    expect(r.summary.revenueSite).toBe(4200 + 2700 + 15000 + 3500 + 5100 + 15000 + 4400 + 6200);
    expect(r.summary.revenueOther).toBe(185000 + 212000 + 60000);
    expect(r.summary.expenses).toBe(18000 + 120000 + 35000 + 21000 + 120000 + 19500 + 45000);
    expect(r.monthly.map((m) => m.month)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(r.monthly.reduce((s, m) => s + m.profit, 0)).toBe(r.summary.profit);
    expect(r.activity).toMatchObject({ requested: 10, completed: 8, cancelled: 1, noShow: 1, completionRate: 80 });
    expect(r.perVehicle[0].payback).not.toBeNull();
    expect(r.summary).toMatchObject({ noShows: 1, noShowLoss: 3000 });
  });

  it("produit un classeur Excel complet", async () => {
    const r = await loadReport(fakeSupabase(), period);
    const buf = await buildReportWorkbook(r, null);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Synthèse", "Mensuel", "Véhicules", "Courses", "Dépenses", "Revenus hors site"]);
    expect(wb.getWorksheet("Courses")!.rowCount).toBe(11);
    expect(wb.getWorksheet("Dépenses")!.rowCount).toBe(8);
    const synth = wb.getWorksheet("Synthèse")!;
    const ca = synth.getRows(1, synth.rowCount)!.find((row) => row.getCell(1).value === "Chiffre d'affaires total");
    expect(ca!.getCell(2).value).toBe(r.summary.revenue);
  });
});
