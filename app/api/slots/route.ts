import { NextResponse } from "next/server";
import { getBusy, getSettings } from "@/lib/server-data";
import { availableSlots } from "@/lib/slots";
import { dakarToUtc, addDays } from "@/lib/time";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const duration = Math.min(300, Math.max(5, Number(url.searchParams.get("duration")) || 20));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("Date invalide.");

  try {
    const settings = await getSettings();
    const from = dakarToUtc(date, "00:00");
    const to = dakarToUtc(addDays(date, 1), "12:00");
    const busy = await getBusy(from - 12 * 3600_000, to);
    const slots = availableSlots(date, duration, Date.now(), busy, settings);
    return NextResponse.json(
      { slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), time: s.time })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("slots", e);
    return jsonError("Impossible de charger les créneaux pour le moment.", 503);
  }
}
