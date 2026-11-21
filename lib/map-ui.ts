"use client";
/**
 * Éléments de carte partagés (Leaflet) : fonds de carte gratuits et sans clé, repères aux couleurs de Luxus Asaad.
 * - « plan » : OpenStreetMap style HOT — affiche pharmacies, écoles, mosquées… les repères utilisés à Dakar.
 * - « clair » : Esri Light Gray — épuré, pour l'aperçu du trajet et le suivi.
 * - « satellite » : imagerie Esri + noms des rues et des lieux.
 * En cas d'échec de chargement, bascule automatiquement sur OpenStreetMap standard.
 */
import L from "leaflet";

export type BaseLayer = "plan" | "clair" | "satellite";

const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

const SOURCES: Record<BaseLayer, { url: string; opts: L.TileLayerOptions }[]> = {
  plan: [
    {
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      opts: { subdomains: "abc", maxZoom: 20, maxNativeZoom: 19, attribution: `${OSM_ATTR}, style HOT` },
    },
  ],
  clair: [
    { url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, opts: { maxZoom: 19, maxNativeZoom: 16, attribution: "&copy; Esri" } },
    { url: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, opts: { maxZoom: 19, maxNativeZoom: 16 } },
  ],
  satellite: [
    { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, opts: { maxZoom: 20, maxNativeZoom: 19, attribution: "Imagerie &copy; Esri" } },
    { url: `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, opts: { maxZoom: 20, maxNativeZoom: 19 } },
    { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, opts: { maxZoom: 20, maxNativeZoom: 19 } },
  ],
};

export function addBaseLayer(map: L.Map, kind: BaseLayer): L.Layer[] {
  const layers = SOURCES[kind].map((src) => L.tileLayer(src.url, src.opts));
  let errors = 0;
  let fellBack = false;
  for (const l of layers) {
    l.on("tileerror", () => {
      errors += 1;
      if (errors > 6 && !fellBack) {
        fellBack = true;
        for (const x of layers) map.removeLayer(x);
        layers.push(L.tileLayer(OSM, { maxZoom: 19, attribution: OSM_ATTR }).addTo(map));
      }
    });
    l.addTo(map);
  }
  return layers;
}

/** Épingle A (départ, noire) ou B (destination, or). Pointe en bas, au point exact. */
export function pinIcon(kind: "A" | "B"): L.DivIcon {
  const body = kind === "A" ? "#0a0a0a" : "#c48a16";
  const disc = kind === "A" ? "#e5b33a" : "#0a0a0a";
  const text = kind === "A" ? "#0a0a0a" : "#e5b33a";
  return L.divIcon({
    className: "la-pin",
    html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true">
      <path d="M18 44.5S32.5 29.4 32.5 18A14.5 14.5 0 0 0 3.5 18C3.5 29.4 18 44.5 18 44.5z" fill="${body}" stroke="#fff" stroke-width="2.5"/>
      <circle cx="18" cy="18" r="8.5" fill="${disc}"/>
      <text x="18" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="${text}">${kind}</text>
    </svg>`,
    iconSize: [36, 46],
    iconAnchor: [18, 45],
  });
}

/** Point bleu « vous êtes ici ». */
export const userDotIcon = L.divIcon({ className: "", html: '<div class="la-user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

/** Voiture du chauffeur (suivi). */
export const carIcon = L.divIcon({
  className: "",
  html: `<div class="la-car"><svg width="20" height="20" viewBox="0 0 24 24" fill="#0a0a0a" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm2.2-1h9.6l-1-3.1a.5.5 0 0 0-.5-.4H8.7a.5.5 0 0 0-.5.4zM7.5 14a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm9 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/></svg></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});
