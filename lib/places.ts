/**
 * Lieux fréquents à Dakar et alentours : proposés instantanément, sans attendre le réseau.
 * Coordonnées issues d'OpenStreetMap (le client peut toujours ajuster le point sur la carte).
 */
import type { Place } from "./types";

interface Popular extends Place {
  /** Mots-clés de recherche supplémentaires (sans accents, minuscules) */
  k?: string;
}

export const POPULAR_PLACES: Popular[] = [
  { address: "Aéroport AIBD (Blaise-Diagne), Diass", lat: 14.66499, lng: -17.07347, k: "aibd aeroport airport diass blaise diagne" },
  { address: "Gare de Dakar (TER), Plateau", lat: 14.67646, lng: -17.43368, k: "gare ter train" },
  { address: "Gare TER de Diamniadio", lat: 14.71639, lng: -17.19883, k: "gare ter train diamniadio" },
  { address: "Place de l'Indépendance, Plateau", lat: 14.66953, lng: -17.43206, k: "centre ville" },
  { address: "Plateau, Dakar", lat: 14.66732, lng: -17.43797, k: "centre ville" },
  { address: "Almadies, Dakar", lat: 14.74419, lng: -17.51753 },
  { address: "Ngor, Dakar", lat: 14.74879, lng: -17.51496 },
  { address: "Yoff, Dakar", lat: 14.76036, lng: -17.46815 },
  { address: "Ouakam, Dakar", lat: 14.72474, lng: -17.48507 },
  { address: "Mermoz, Dakar", lat: 14.70745, lng: -17.4744 },
  { address: "Sacré-Cœur, Dakar", lat: 14.70573, lng: -17.46921, k: "sacre coeur" },
  { address: "Point E, Dakar", lat: 14.69648, lng: -17.46418 },
  { address: "Fann Résidence, Dakar", lat: 14.68973, lng: -17.47086 },
  { address: "Médina, Dakar", lat: 14.68049, lng: -17.45093 },
  { address: "Liberté 6, Dakar", lat: 14.73349, lng: -17.46716 },
  { address: "Grand Yoff, Dakar", lat: 14.73668, lng: -17.45281 },
  { address: "Ouest Foire, Dakar", lat: 14.74939, lng: -17.47021, k: "foire" },
  { address: "Parcelles Assainies, Dakar", lat: 14.75941, lng: -17.43845, k: "parcelles" },
  { address: "Patte d'Oie, Dakar", lat: 14.74649, lng: -17.44069 },
  { address: "Hann Maristes, Dakar", lat: 14.72456, lng: -17.43916 },
  { address: "Guédiawaye", lat: 14.77712, lng: -17.39007 },
  { address: "Pikine", lat: 14.75154, lng: -17.39641 },
  { address: "Keur Massar", lat: 14.78226, lng: -17.3112 },
  { address: "Rufisque", lat: 14.71642, lng: -17.27384 },
  { address: "Diamniadio", lat: 14.72022, lng: -17.18424 },
  { address: "UCAD (Université Cheikh Anta Diop), Fann", lat: 14.68725, lng: -17.46445, k: "universite fac" },
  { address: "Monument de la Renaissance africaine, Ouakam", lat: 14.72214, lng: -17.495, k: "monument" },
  { address: "Sea Plaza, Corniche Ouest", lat: 14.69346, lng: -17.47477, k: "corniche centre commercial" },
  { address: "Dakar Arena, Diamniadio", lat: 14.73398, lng: -17.2122 },
  { address: "Stade Abdoulaye Wade, Diamniadio", lat: 14.73276, lng: -17.20149, k: "stade" },
  { address: "Hôpital Principal de Dakar, Plateau", lat: 14.66226, lng: -17.43458, k: "hopital" },
  { address: "Hôpital de Fann", lat: 14.69322, lng: -17.46657, k: "hopital" },
  { address: "Port autonome de Dakar", lat: 14.68413, lng: -17.4279 },
  { address: "Lac Rose", lat: 14.8388, lng: -17.23283, k: "retba" },
  { address: "Saly Portudal", lat: 14.44111, lng: -17.01483 },
  { address: "Mbour", lat: 14.42074, lng: -16.97148 },
  { address: "Thiès", lat: 14.79146, lng: -16.92561, k: "thies" },
];

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INDEX = POPULAR_PLACES.map((p) => ({ p, text: normalize(`${p.address} ${p.k ?? ""}`) }));

/** Lieux fréquents correspondant à la saisie (chaque mot doit commencer un mot du lieu). */
export function matchPopular(q: string, limit = 4): Place[] {
  const words = normalize(q).split(" ").filter(Boolean);
  if (!words.length) return [];
  return INDEX.filter(({ text }) => {
    const tokens = text.split(" ");
    return words.every((w) => tokens.some((t) => t.startsWith(w)));
  })
    .slice(0, limit)
    .map(({ p }) => ({ lat: p.lat, lng: p.lng, address: p.address }));
}
