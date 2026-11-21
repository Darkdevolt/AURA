import type { LatLng, Settings } from "./types";
import { haversineKm } from "./geo";

/** Aéroport international Blaise Diagne (AIBD), Diass */
export const AIBD: LatLng = { lat: 14.67, lng: -17.073 };
export const AIBD_RADIUS_KM = 3;

export function roundUp(value: number, step: number): number {
  if (step <= 1) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}

export function isNearAirport(p: LatLng): boolean {
  return haversineKm(p, AIBD) <= AIBD_RADIUS_KM;
}

export type PricingSettings = Pick<
  Settings,
  "pickup_fee" | "price_per_km" | "min_fare" | "round_to" | "airport_enabled" | "airport_fixed_price"
>;

export interface PriceResult {
  price: number;
  airport: boolean;
}

/**
 * Prix = prise en charge + prix/km × distance, minimum de course,
 * arrondi aux 100 FCFA supérieurs. Tarif fixe si départ ou arrivée à l'AIBD.
 */
export function computePrice(
  distanceKm: number,
  s: PricingSettings,
  pickup?: LatLng,
  dropoff?: LatLng,
): PriceResult {
  const airport =
    s.airport_enabled &&
    s.airport_fixed_price > 0 &&
    ((pickup && isNearAirport(pickup)) || (dropoff && isNearAirport(dropoff)));
  if (airport) return { price: roundUp(s.airport_fixed_price, s.round_to), airport: true };

  const raw = s.pickup_fee + s.price_per_km * Math.max(0, distanceKm);
  return { price: roundUp(Math.max(raw, s.min_fare), s.round_to), airport: false };
}

export function formatFcfa(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;
}
