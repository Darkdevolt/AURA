import { computePrice, type PricingSettings } from "./pricing";
import type { LatLng, ServiceKind, Settings } from "./types";

export type ServiceSettings = PricingSettings &
  Pick<Settings, "half_day_enabled" | "half_day_hours" | "half_day_price" | "full_day_enabled" | "full_day_hours" | "full_day_price">;

export const SERVICE_LABELS: Record<ServiceKind, string> = {
  course: "Course",
  demi_journee: "Mise à disposition — demi-journée",
  journee: "Mise à disposition — journée",
};

export const isDisposal = (s: ServiceKind) => s !== "course";

/** Durée réservée pour une mise à disposition (minutes). */
export function disposalMinutes(service: ServiceKind, s: ServiceSettings): number {
  return service === "journee" ? s.full_day_hours * 60 : service === "demi_journee" ? s.half_day_hours * 60 : 0;
}

export function serviceEnabled(service: ServiceKind, s: ServiceSettings): boolean {
  return service === "course" || (service === "journee" ? s.full_day_enabled : s.half_day_enabled);
}

/** Prix d'une prestation : forfait pour la mise à disposition, calcul au km pour une course. */
export function servicePrice(service: ServiceKind, s: ServiceSettings, distanceKm = 0, pickup?: LatLng, dropoff?: LatLng) {
  if (service === "journee") return { price: s.full_day_price, airport: false };
  if (service === "demi_journee") return { price: s.half_day_price, airport: false };
  return computePrice(distanceKm, s, pickup, dropoff);
}

export function parseService(v: unknown): ServiceKind {
  return v === "journee" || v === "demi_journee" ? v : "course";
}
