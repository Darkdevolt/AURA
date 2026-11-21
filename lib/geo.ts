import type { LatLng } from "./types";

export const DAKAR_CENTER: LatLng = { lat: 14.7167, lng: -17.4677 };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RouteEstimate {
  distanceKm: number;
  durationMin: number;
  source: "osrm" | "fallback";
}

/** Estimation de secours : vol d'oiseau × 1,3 à 20 km/h de moyenne */
export function fallbackRoute(a: LatLng, b: LatLng): RouteEstimate {
  const distanceKm = haversineKm(a, b) * 1.3;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.max(5, Math.ceil((distanceKm / 20) * 60)),
    source: "fallback",
  };
}

/** Distance et durée par la route via l'API publique OSRM, avec repli. */
export async function estimateRoute(a: LatLng, b: LatLng, timeoutMs = 5000): Promise<RouteEstimate> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = (await res.json()) as { code: string; routes?: { distance: number; duration: number }[] };
    const r = data.routes?.[0];
    if (data.code !== "Ok" || !r) throw new Error("OSRM sans itinéraire");
    return {
      distanceKm: Math.round((r.distance / 1000) * 10) / 10,
      // OSRM est optimiste pour la circulation dakaroise : on garde au moins 20 km/h
      durationMin: Math.max(5, Math.ceil(Math.max(r.duration / 60, (r.distance / 1000 / 20) * 60 * 0.75))),
      source: "osrm",
    };
  } catch {
    return fallbackRoute(a, b);
  } finally {
    clearTimeout(timer);
  }
}

export function googleMapsLink(p: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

export function wazeLink(p: LatLng): string {
  return `https://waze.com/ul?ll=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&navigate=yes`;
}

/** Le Sénégal (boîte englobante large) */
export function isInSenegal(p: LatLng): boolean {
  return p.lat > 12.2 && p.lat < 16.8 && p.lng > -17.6 && p.lng < -11.3;
}
