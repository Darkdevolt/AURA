import { describe, expect, it } from "vitest";
import { availableSlots, blockMinutes, bookableDates, chargeIntervals, checkStart, dayKm, daySlotStarts, type BusyInterval } from "@/lib/slots";
import { dakarToUtc } from "@/lib/time";
import { DEFAULT_SETTINGS } from "@/lib/types";

const r = DEFAULT_SETTINGS;
const MIN = 60_000;
// Lundi 23 novembre 2026, 07h00 à Dakar
const MONDAY = "2026-11-23";
const now = dakarToUtc(MONDAY, "07:00");

describe("daySlotStarts", () => {
  it("24 créneaux de 30 min de 8h00 à 19h30", () => {
    const slots = daySlotStarts(MONDAY, r);
    expect(slots).toHaveLength(24);
    expect(slots[0].time).toBe("08:00");
    expect(slots.at(-1)!.time).toBe("19:30");
  });
  it("dimanche fermé", () => {
    expect(daySlotStarts("2026-11-22", r)).toEqual([]);
  });
  it("heure de Dakar = UTC", () => {
    expect(new Date(dakarToUtc(MONDAY, "08:00")).toISOString()).toBe("2026-11-23T08:00:00.000Z");
  });
});

describe("blockMinutes", () => {
  it("durée + 30 min d'approche + 15 min de marge", () => {
    expect(blockMinutes(20, r)).toBe(65);
  });
});

describe("availableSlots", () => {
  it("impose 60 minutes de délai minimum", () => {
    const at0730 = dakarToUtc(MONDAY, "07:30");
    const slots = availableSlots(MONDAY, 20, at0730, [], r);
    expect(slots[0].time).toBe("08:30");
  });

  it("une réservation bloque les créneaux qui la chevauchent (1 véhicule)", () => {
    // Réservation 10h00, 20 min → bloque jusqu'à 11h05
    const busy: BusyInterval[] = [
      { start: dakarToUtc(MONDAY, "10:00"), end: dakarToUtc(MONDAY, "11:05"), kind: "booking" },
    ];
    const times = availableSlots(MONDAY, 20, now, busy, r).map((s) => s.time);
    // 09h00 + 65 min = 10h05 > 10h00 → indisponible ; 08h30 + 65 = 09h35 → OK
    expect(times).toContain("08:30");
    expect(times).not.toContain("09:00");
    expect(times).not.toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).not.toContain("11:00");
    expect(times).toContain("11:30");
  });

  it("avec 2 véhicules, deux courses simultanées sont possibles", () => {
    const busy: BusyInterval[] = [
      { start: dakarToUtc(MONDAY, "10:00"), end: dakarToUtc(MONDAY, "11:05"), kind: "booking" },
    ];
    const times = availableSlots(MONDAY, 20, now, busy, { ...r, vehicles: 2 }).map((s) => s.time);
    expect(times).toContain("10:00");
    const busy2 = [...busy, { ...busy[0] }];
    expect(availableSlots(MONDAY, 20, now, busy2, { ...r, vehicles: 2 }).map((s) => s.time)).not.toContain("10:00");
  });

  it("les plages bloquées par l'admin bloquent tous les véhicules", () => {
    const busy: BusyInterval[] = [
      { start: dakarToUtc(MONDAY, "12:00"), end: dakarToUtc(MONDAY, "14:00"), kind: "blocked" },
    ];
    const times = availableSlots(MONDAY, 20, now, busy, { ...r, vehicles: 3 }).map((s) => s.time);
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("13:30");
    expect(times).toContain("14:00");
    expect(times).not.toContain("11:00"); // 11h00 + 65 min déborde sur 12h00
  });
});

describe("checkStart", () => {
  it("refuse plus de 14 jours à l'avance", () => {
    expect(checkStart(dakarToUtc("2026-12-08", "10:00"), 20, now, [], r)).toBe("too_far");
    expect(checkStart(dakarToUtc("2026-12-07", "10:00"), 20, now, [], r)).toBeNull();
  });
  it("refuse hors horaires, hors grille et le dimanche", () => {
    expect(checkStart(dakarToUtc(MONDAY, "20:00"), 20, now, [], r)).toBe("outside_hours");
    expect(checkStart(dakarToUtc(MONDAY, "10:15"), 20, now, [], r)).toBe("not_on_grid");
    expect(checkStart(dakarToUtc("2026-11-29", "10:00"), 20, now, [], r)).toBe("closed_day");
  });
  it("refuse moins d'une heure à l'avance", () => {
    expect(checkStart(dakarToUtc(MONDAY, "08:00"), 20, now + 30 * MIN, [], r)).toBe("too_soon");
  });
});

describe("bookableDates", () => {
  it("liste les jours ouverts sur 14 jours (sans dimanche)", () => {
    const dates = bookableDates(now, r);
    expect(dates[0]).toBe(MONDAY);
    expect(dates).not.toContain("2026-11-29");
    expect(dates.at(-1)).toBe("2026-12-07");
    expect(dates).toHaveLength(13);
  });
});

describe("mise à disposition", () => {
  it("la journée (10 h) doit se terminer avant 20h00", () => {
    const times = availableSlots(MONDAY, 600, now, [], r, { endByClose: true }).map((s) => s.time);
    expect(times[0]).toBe("08:00");
    expect(times.at(-1)).toBe("10:00");
    expect(checkStart(dakarToUtc(MONDAY, "10:30"), 600, now, [], r, { endByClose: true })).toBe("ends_after_close");
  });
  it("bloque le véhicule pendant toute la durée", () => {
    const busy: BusyInterval[] = [{ start: dakarToUtc(MONDAY, "09:00"), end: dakarToUtc(MONDAY, "09:00") + (300 + 45) * MIN, kind: "booking" }];
    const times = availableSlots(MONDAY, 20, now, busy, r).map((s) => s.time);
    expect(times).not.toContain("13:30");
    expect(times).toContain("15:00");
  });
});

describe("véhicules électriques", () => {
  it("les pauses de recharge ne sont jamais proposées", () => {
    const busy = chargeIntervals(MONDAY, [{ start: "13:00", end: "14:00" }], r);
    const times = availableSlots(MONDAY, 20, now, busy, r).map((s) => s.time);
    expect(times).not.toContain("13:00");
    expect(times).not.toContain("13:30");
    expect(times).not.toContain("12:00"); // 12h00 + 65 min déborde sur la recharge
    expect(times).toContain("14:00");
    expect(chargeIntervals("2026-11-22", [{ start: "13:00", end: "14:00" }], r)).toEqual([]); // dimanche
  });
  it("refuse au-delà de l'autonomie du jour", () => {
    const rr = { ...r, range_km: 180 };
    const busy: BusyInterval[] = [
      { start: dakarToUtc(MONDAY, "08:00"), end: dakarToUtc(MONDAY, "09:30"), kind: "booking", km: 120 },
      { start: dakarToUtc(MONDAY, "10:00"), end: dakarToUtc(MONDAY, "11:00"), kind: "booking", km: 40 },
    ];
    expect(dayKm(busy, MONDAY)).toBe(160);
    expect(checkStart(dakarToUtc(MONDAY, "15:00"), 20, now, busy, rr, { km: 15 })).toBeNull();
    expect(checkStart(dakarToUtc(MONDAY, "15:00"), 20, now, busy, rr, { km: 30 })).toBe("no_range");
    // Avec 2 véhicules, l'autonomie double
    expect(checkStart(dakarToUtc(MONDAY, "15:00"), 20, now, busy, { ...rr, vehicles: 2 }, { km: 30 })).toBeNull();
  });
});
