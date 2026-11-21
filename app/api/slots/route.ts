import { NextResponse } from "next/server";
import { getBusyWithCharging, getSettings } from "@/lib/server-data";
import { disposalMinutes, isDisposal, parseService, serviceKm } from "@/lib/service";
import { availableSlots } from "@/lib/slots";
import { dakarToUtc, addDays } from "@/lib/time";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const service = parseService(url.searchParams.get("service"));
  const requested = Math.min(300, Math.max(5, Number(url.searchParams.get("duration")) || 20));
  const distance = Math.min(500, Math.max(0, Number(url.searchParams.get("km")) || 0));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("Date invalide.");

  try {
    const from = dakarToUtc(date, "00:00");
    const to = dakarToUtc(addDays(date, 1), "12:00");
    const settings = await getSettings();
    const busy = await getBusyWithCharging(from - 12 * 3600_000, to, settings);
    const disposal = isDisposal(service);
    const duration = disposal ? disposalMinutes(service, settings) : requested;
    const km = serviceKm(service, distance, duration, settings);
    const slots = availableSlots(date, duration, Date.now(), busy, settings, { endByClose: disposal, km });
    return NextResponse.json(
      { slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), time: s.time })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("slots", e);
    return jsonError("Impossible de charger les créneaux pour le moment.", 503);
  }
}
