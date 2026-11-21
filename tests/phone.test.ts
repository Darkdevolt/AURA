import { describe, expect, it } from "vitest";
import { formatSenegalPhone, normalizeSenegalPhone } from "@/lib/phone";

describe("normalizeSenegalPhone", () => {
  it("accepte les formats courants", () => {
    expect(normalizeSenegalPhone("77 123 45 67")).toBe("+221771234567");
    expect(normalizeSenegalPhone("+221 78 123 45 67")).toBe("+221781234567");
    expect(normalizeSenegalPhone("00221701234567")).toBe("+221701234567");
    expect(normalizeSenegalPhone("221-76-123-45-67")).toBe("+221761234567");
  });
  it("refuse les numéros invalides", () => {
    expect(normalizeSenegalPhone("33 823 45 67")).toBeNull();
    expect(normalizeSenegalPhone("77 123 45")).toBeNull();
    expect(normalizeSenegalPhone("+33 6 12 34 56 78")).toBeNull();
    expect(normalizeSenegalPhone("72 123 45 67")).toBeNull();
  });
  it("formate pour l'affichage", () => {
    expect(formatSenegalPhone("+221771234567")).toBe("+221 77 123 45 67");
  });
});
