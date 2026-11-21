/**
 * Recherche d'adresse au Sénégal.
 * 1. Photon (OpenStreetMap, fait pour la saisie au fil de l'eau, rapide).
 * 2. Nominatim en secours (règle d'usage : 1 requête/seconde maximum → file d'attente).
 * Les réponses sont gardées en mémoire pour ne jamais refaire la même requête.
 */
import type { LatLng, Place } from "./types";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io";
// Sénégal entier ; les résultats proches de Dakar passent en premier
const SN_BBOX = "-17.6,12.3,-11.3,16.7";
const DAKAR = { lat: 14.72, lon: -17.44 };

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

const searchCache = new Map<string, Place[]>();
const reverseCache = new Map<string, string>();

function join(parts: (string | undefined)[], max = 3): string {
  return parts
    .filter((p, i, arr): p is string => !!p && arr.indexOf(p) === i)
    .slice(0, max)
    .join(", ");
}

// ------------------------------------------------------------------ Photon
interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    county?: string;
    countrycode?: string;
  };
}

function photonLabel(p: PhotonFeature["properties"]): string {
  const street = p.street ? (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) : undefined;
  return join([p.name, street, p.district || p.locality, p.city || p.county]);
}

async function photonSearch(q: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q, lang: "fr", limit: "8", lat: String(DAKAR.lat), lon: String(DAKAR.lon), bbox: SN_BBOX });
  const res = await fetch(`${PHOTON}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features: PhotonFeature[] };
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of data.features) {
    if (f.properties.countrycode && f.properties.countrycode !== "SN") continue;
    const address = photonLabel(f.properties);
    if (!address || seen.has(address)) continue;
    seen.add(address);
    out.push({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], address });
    if (out.length === 6) break;
  }
  return out;
}

// ------------------------------------------------------------------ Nominatim
interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Record<string, string>;
}

function nominatimLabel(it: NominatimItem): string {
  const a = it.address ?? {};
  const label = join([
    it.name,
    a.road && a.house_number ? `${a.house_number} ${a.road}` : a.road,
    a.neighbourhood || a.suburb || a.quarter,
    a.city || a.town || a.village || a.county,
  ]);
  return label || it.display_name.split(",").slice(0, 3).join(",");
}

async function nominatimSearch(q: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    countrycodes: "sn",
    addressdetails: "1",
    limit: "6",
    "accept-language": "fr",
    viewbox: "-17.56,14.92,-16.85,14.55",
  });
  return throttled(async () => {
    if (signal?.aborted) return [];
    const res = await fetch(`${NOMINATIM}/search?${params}`, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as NominatimItem[];
    return data.map((it) => ({ lat: Number(it.lat), lng: Number(it.lon), address: nominatimLabel(it) }));
  });
}

// ------------------------------------------------------------------ API publique
export async function searchAddress(q: string, signal?: AbortSignal): Promise<Place[]> {
  const key = q.trim().toLowerCase();
  const hit = searchCache.get(key);
  if (hit) return hit;
  let results: Place[] = [];
  try {
    results = await photonSearch(q, signal);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
  }
  if (!results.length) results = await nominatimSearch(q, signal);
  searchCache.set(key, results);
  return results;
}

export async function reverseGeocode(p: LatLng): Promise<string> {
  const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  const hit = reverseCache.get(key);
  if (hit) return hit;
  const save = (label: string) => {
    reverseCache.set(key, label);
    return label;
  };
  // Photon d'abord (rapide) ; on garde son résultat s'il contient au moins un nom ou une rue
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${p.lat}&lon=${p.lng}&lang=fr&limit=1`);
    if (res.ok) {
      const f = ((await res.json()) as { features: PhotonFeature[] }).features[0];
      if (f && (f.properties.name || f.properties.street)) return save(photonLabel(f.properties));
    }
  } catch {
    /* on passe à Nominatim */
  }
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
      const res = await fetch(`${NOMINATIM}/reverse?${params}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error();
      const it = (await res.json()) as NominatimItem & { error?: string };
      if (it.error) throw new Error();
      return save(nominatimLabel(it));
    });
  } catch {
    return `Point sur la carte (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})`;
  }
}
