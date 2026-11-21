/**
 * Toutes les dates sont manipulées en millisecondes UTC et converties vers/depuis
 * l'heure de Dakar (Africa/Dakar, UTC+0 toute l'année, sans heure d'été).
 * Le calcul reste générique (via Intl) pour ne dépendre d'aucune hypothèse.
 */
export const TZ = "Africa/Dakar";

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = dimanche
}

export function zonedParts(ms: number): ZonedParts {
  const p: Record<string, string> = {};
  for (const part of partsFmt.formatToParts(new Date(ms))) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS[p.weekday] ?? 0,
  };
}

/** Décalage (minutes) du fuseau de Dakar par rapport à UTC à un instant donné. */
function offsetMinutes(ms: number): number {
  const z = zonedParts(ms);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** "2026-11-23" + "08:30" (heure de Dakar) → ms UTC */
export function dakarToUtc(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  return guess - offsetMinutes(guess) * 60000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ms UTC → "YYYY-MM-DD" (date à Dakar) */
export function dakarDate(ms: number): string {
  const z = zonedParts(ms);
  return `${z.year}-${pad(z.month)}-${pad(z.day)}`;
}

/** ms UTC → "HH:mm" (heure à Dakar) */
export function dakarTime(ms: number): string {
  const z = zonedParts(ms);
  return `${pad(z.hour)}:${pad(z.minute)}`;
}

/** Jour de la semaine (0 = dimanche) d'une date "YYYY-MM-DD" */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Ajoute n jours à une date "YYYY-MM-DD" */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** "08:30:00" → 510 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function formatDateLong(ms: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(ms));
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDateTime(ms: number): string {
  return `${formatDateLong(ms)} à ${dakarTime(ms).replace(":", "h")}`;
}
