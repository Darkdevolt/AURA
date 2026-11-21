import type { Settings } from "./types";
import { addDays, dakarDate, dakarToUtc, minutesToTime, timeToMinutes, weekdayOf } from "./time";

export type SlotRules = Pick<
  Settings,
  | "open_time"
  | "close_time"
  | "open_days"
  | "slot_minutes"
  | "approach_minutes"
  | "margin_minutes"
  | "min_notice_minutes"
  | "max_days_ahead"
  | "vehicles"
> & { range_km?: number };

export interface BusyInterval {
  start: number; // ms UTC
  end: number; // ms UTC
  kind: "booking" | "blocked";
  /** Kilomètres prévus (réservations) : sert au calcul d'autonomie */
  km?: number;
  bookingId?: string | null;
}

export interface Slot {
  start: number; // ms UTC
  time: string; // "HH:mm" heure de Dakar
}

const MIN = 60_000;

/** Durée bloquée par une course : durée estimée + approche + marge (minutes) */
export function blockMinutes(durationMin: number, r: SlotRules): number {
  return Math.ceil(durationMin) + r.approach_minutes + r.margin_minutes;
}

/** Tous les débuts de créneaux théoriques d'une journée (heure de Dakar). */
export function daySlotStarts(date: string, r: SlotRules): Slot[] {
  if (!r.open_days.includes(weekdayOf(date))) return [];
  const open = timeToMinutes(r.open_time);
  const close = timeToMinutes(r.close_time);
  const out: Slot[] = [];
  for (let m = open; m < close; m += r.slot_minutes) {
    const time = minutesToTime(m);
    out.push({ start: dakarToUtc(date, time), time });
  }
  return out;
}

/** Nombre maximal de réservations simultanées sur [start, end). */
export function maxConcurrency(busy: BusyInterval[], start: number, end: number): number {
  const bookings = busy.filter((b) => b.kind === "booking" && b.start < end && b.end > start);
  const points = [start, ...bookings.map((b) => b.start).filter((p) => p > start && p < end)];
  let max = 0;
  for (const p of points) {
    const c = bookings.filter((b) => b.start <= p && b.end > p).length;
    if (c > max) max = c;
  }
  return max;
}

export interface StartOptions {
  /** La prestation entière doit tenir dans les horaires d'ouverture (mise à disposition). */
  endByClose?: boolean;
  /** Kilomètres de la nouvelle prestation (approche comprise) pour vérifier l'autonomie du jour. */
  km?: number;
}

/** Pauses de recharge récurrentes d'une journée d'ouverture, sous forme de plages bloquées. */
export function chargeIntervals(date: string, windows: { start: string; end: string }[], r: Pick<SlotRules, "open_days">): BusyInterval[] {
  if (!r.open_days.includes(weekdayOf(date))) return [];
  return windows
    .filter((w) => /^\d{2}:\d{2}/.test(w.start) && /^\d{2}:\d{2}/.test(w.end) && w.end > w.start)
    .map((w) => ({ start: dakarToUtc(date, w.start.slice(0, 5)), end: dakarToUtc(date, w.end.slice(0, 5)), kind: "blocked" as const }));
}

/** Kilomètres déjà prévus sur une journée (réservations qui commencent ce jour-là). */
export function dayKm(busy: BusyInterval[], date: string): number {
  return busy.filter((b) => b.kind === "booking" && dakarDate(b.start) === date).reduce((s, b) => s + (b.km ?? 0), 0);
}

export type SlotError =
  | "no_range"
  | "ends_after_close"
  | "closed_day"
  | "outside_hours"
  | "not_on_grid"
  | "too_soon"
  | "too_far"
  | "unavailable";

export const SLOT_ERROR_MESSAGES: Record<SlotError, string> = {
  closed_day: "Nous ne travaillons pas ce jour-là.",
  outside_hours: "Cet horaire est en dehors de nos heures d'ouverture.",
  not_on_grid: "Merci de choisir un créneau proposé.",
  too_soon: "Les réservations doivent être faites au moins 1 heure à l'avance.",
  too_far: "Les réservations sont possibles jusqu'à 14 jours à l'avance.",
  unavailable: "Ce créneau n'est plus disponible. Merci d'en choisir un autre.",
  ends_after_close: "La prestation doit se terminer avant l'heure de fermeture : choisissez un horaire plus tôt.",
  no_range: "Nos véhicules électriques sont déjà très sollicités ce jour-là : choisissez un autre jour ou appelez-nous.",
};

/** Vérifie qu'un horaire de départ est réservable. Retourne null si OK. */
export function checkStart(
  start: number,
  durationMin: number,
  now: number,
  busy: BusyInterval[],
  r: SlotRules,
  opts: StartOptions = {},
): SlotError | null {
  const date = dakarDate(start);
  if (!r.open_days.includes(weekdayOf(date))) return "closed_day";
  const slot = daySlotStarts(date, r).find((s) => s.start === start);
  if (!slot) {
    const m = (start - dakarToUtc(date, "00:00")) / MIN;
    if (m < timeToMinutes(r.open_time) || m >= timeToMinutes(r.close_time)) return "outside_hours";
    return "not_on_grid";
  }
  if (start < now + r.min_notice_minutes * MIN) return "too_soon";
  const lastDay = addDays(dakarDate(now), r.max_days_ahead);
  if (date > lastDay) return "too_far";

  if (opts.endByClose && start + durationMin * MIN > dakarToUtc(date, "00:00") + timeToMinutes(r.close_time) * MIN) return "ends_after_close";
  const end = start + blockMinutes(durationMin, r) * MIN;
  if (busy.some((b) => b.kind === "blocked" && b.start < end && b.end > start)) return "unavailable";
  if (maxConcurrency(busy, start, end) >= r.vehicles) return "unavailable";
  // Autonomie : kilomètres de la journée ≤ autonomie × nombre de véhicules
  if (r.range_km && opts.km && dayKm(busy, date) + opts.km > r.range_km * r.vehicles) return "no_range";
  return null;
}

/** Créneaux disponibles d'une journée pour une course de durée donnée. */
export function availableSlots(
  date: string,
  durationMin: number,
  now: number,
  busy: BusyInterval[],
  r: SlotRules,
  opts: StartOptions = {},
): Slot[] {
  return daySlotStarts(date, r).filter((s) => checkStart(s.start, durationMin, now, busy, r, opts) === null);
}

/** Jours ouverts réservables à partir d'aujourd'hui (heure de Dakar). */
export function bookableDates(now: number, r: SlotRules): string[] {
  const today = dakarDate(now);
  const out: string[] = [];
  for (let i = 0; i <= r.max_days_ahead; i++) {
    const d = addDays(today, i);
    if (r.open_days.includes(weekdayOf(d))) out.push(d);
  }
  return out;
}
