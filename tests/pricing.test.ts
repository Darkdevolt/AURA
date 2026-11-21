import { describe, expect, it } from "vitest";
import { AIBD, computePrice, roundUp } from "@/lib/pricing";
import { DEFAULT_SETTINGS } from "@/lib/types";

const s = DEFAULT_SETTINGS;
const plateau = { lat: 14.668, lng: -17.432 };
const almadies = { lat: 14.745, lng: -17.52 };

describe("roundUp", () => {
  it("arrondit aux 100 supérieurs", () => {
    expect(roundUp(1001, 100)).toBe(1100);
    expect(roundUp(1100, 100)).toBe(1100);
    expect(roundUp(1150.5, 100)).toBe(1200);
  });
});

describe("computePrice", () => {
  it("applique le minimum de course", () => {
    // 500 + 300 × 1 = 800 → minimum 1 000
    expect(computePrice(1, s).price).toBe(1000);
    expect(computePrice(0, s).price).toBe(1000);
  });
  it("prise en charge + km, arrondi aux 100 FCFA supérieurs", () => {
    // 500 + 300 × 7,3 = 2 690 → 2 700
    expect(computePrice(7.3, s).price).toBe(2700);
    // 500 + 300 × 10 = 3 500
    expect(computePrice(10, s).price).toBe(3500);
  });
  it("tarif fixe aéroport AIBD au départ ou à l'arrivée", () => {
    expect(computePrice(48, s, plateau, AIBD)).toEqual({ price: 15000, airport: true });
    expect(computePrice(48, s, AIBD, plateau)).toEqual({ price: 15000, airport: true });
  });
  it("pas de tarif aéroport s'il est désactivé ou hors zone", () => {
    expect(computePrice(48, { ...s, airport_enabled: false }, plateau, AIBD).airport).toBe(false);
    expect(computePrice(12, s, plateau, almadies).airport).toBe(false);
  });
  it("respecte des tarifs modifiés", () => {
    expect(computePrice(5, { ...s, pickup_fee: 1000, price_per_km: 250, min_fare: 2000 }).price).toBe(2300);
  });
});
