/**
 * Recherche d'adresse via Nominatim (OpenStreetMap), limitée au Sénégal.
 * Règles d'usage : 1 requête/seconde maximum → file d'attente avec délai.
 */
import type { LatLng, Place } from "./types";

const BASE = "https://nominatim.openstreetmap.org";
const MIN_INTERVAL_MS = 1100;
let last = 0;
let queue: Promise<unknown> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = last + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string>;
}

/** Libellé court et lisible (« Pharmacie X, Sacré-Cœur, Dakar ») */
function shortLabel(it: NominatimItem): string {
  const a = it.address ?? {};
  const parts = [
    it.name,
    a.road && a.house_number ? `${a.house_number} ${a.road}` : a.road,
    a.neighbourhood || a.suburb || a.quarter,
    a.city || a.town || a.village || a.county,
  ].filter((p, i, arr): p is string => !!p && arr.indexOf(p) === i);
  return parts.length ? parts.slice(0, 3).join(", ") : it.display_name.split(",").slice(0, 3).join(",");
}

export async function searchAddress(q: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    countrycodes: "sn",
    addressdetails: "1",
    limit: "6",
    "accept-language": "fr",
    // Préférence pour la région de Dakar / Thiès sans exclure le reste du pays
    viewbox: "-17.56,14.92,-16.85,14.55",
  });
  return throttled(async () => {
    if (signal?.aborted) return [];
    const res = await fetch(`${BASE}/search?${params}`, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as NominatimItem[];
    return data.map((it) => ({ lat: Number(it.lat), lng: Number(it.lon), address: shortLabel(it) }));
  });
}

export async function reverseGeocode(p: LatLng): Promise<string> {
  const params = new URLSearchParams({
    lat: String(p.lat),
    lon: String(p.lng),
    format: "jsonv2",
    zoom: "18",
    addressdetails: "1",
    "accept-language": "fr",
  });
  try {
    return await throttled(async () => {
      const res = await fetch(`${BASE}/reverse?${params}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error();
      const it = (await res.json()) as NominatimItem & { error?: string };
      if (it.error) throw new Error();
      return shortLabel(it);
    });
  } catch {
    return `Point sur la carte (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})`;
  }
}
