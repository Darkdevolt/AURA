import { describe, expect, it } from "vitest";
import { dayGap, docStatus, workingDays, workingDaysInMonth } from "@/lib/fleet";

describe("jours ouvrés (lundi → samedi)", () => {
  it("compte 25 jours en novembre 2026 et 27 en décembre 2026", () => {
    expect(workingDaysInMonth("2026-11")).toBe(25);
    expect(workingDaysInMonth("2026-12")).toBe(27);
  });
  it("compte 16 jours ouvrés du 12 au 30 novembre 2026", () => {
    expect(workingDays("2026-11-12", "2026-11-30")).toBe(16);
  });
});

describe("écart de caisse du jour", () => {
  it("vaut 0 quand tout est expliqué", () => {
    expect(dayGap({ cashCollected: 27800, recharges: 11100, yangoTopup: 0, otherExpenses: 0, vaultOut: 0, vaultIn: 16700 })).toBe(0);
  });
  it("retrouve l'écart du 20/11 (720 F gardés par le chauffeur)", () => {
    expect(dayGap({ cashCollected: 32300, recharges: 9700, yangoTopup: 0, otherExpenses: 2000, vaultOut: 1000, vaultIn: 20880 })).toBe(720);
  });
});

describe("documents du véhicule", () => {
  it("signale les documents expirés ou qui expirent dans 30 jours", () => {
    expect(docStatus("2026-11-01", "2026-11-23")).toBe("expire");
    expect(docStatus("2026-12-10", "2026-11-23")).toBe("bientot");
    expect(docStatus("2027-06-01", "2026-11-23")).toBe("ok");
    expect(docStatus(null, "2026-11-23")).toBe("sans_date");
  });
});
