import { describe, expect, it } from "vitest";
import { disposalMinutes, parseService, servicePrice } from "@/lib/service";
import { DEFAULT_SETTINGS } from "@/lib/types";

describe("prestations", () => {
  it("forfaits de mise à disposition", () => {
    expect(servicePrice("journee", DEFAULT_SETTINGS).price).toBe(45000);
    expect(servicePrice("demi_journee", DEFAULT_SETTINGS).price).toBe(25000);
    expect(servicePrice("course", DEFAULT_SETTINGS, 10).price).toBe(3500);
    expect(disposalMinutes("journee", DEFAULT_SETTINGS)).toBe(600);
    expect(disposalMinutes("demi_journee", { ...DEFAULT_SETTINGS, half_day_hours: 4 })).toBe(240);
  });
  it("valeur inconnue = course", () => {
    expect(parseService("journee")).toBe("journee");
    expect(parseService("n'importe quoi")).toBe("course");
  });
});
