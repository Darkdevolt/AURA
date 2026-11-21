import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { normalizeSenegalPhone } from "@/lib/phone";
import { getBusyWithCharging, getSettings } from "@/lib/server-data";
import { parseService, serviceKm } from "@/lib/service";
import { checkStart, SLOT_ERROR_MESSAGES } from "@/lib/slots";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, [string, number]> = {
  not_found: ["Aucune réservation trouvée avec ces informations.", 404],
  no_proposal: ["Il n'y a plus de proposition en attente pour cette réservation.", 409],
  expired: ["Cet horaire est déjà passé : contactez-nous sur WhatsApp.", 409],
};

/** Le client accepte ou refuse l'horaire proposé par Luxus Asaad. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reference = str(body.reference, 20).toUpperCase();
  const phone = normalizeSenegalPhone(str(body.phone, 30));
  const accept = body.accept === true;
  if (!/^LA-\d{4,}$/.test(reference) || !phone) return jsonError("Numéro de réservation ou téléphone invalide.");
  const token = SERVER_RPC_TOKEN();
  const db = supabasePublic();

  if (accept) {
    // Revérifie que l'horaire proposé est toujours libre (hors cette réservation)
    const { data } = await db.rpc("luxus_get_booking", { p_token: token, p_reference: reference, p_phone: phone });
    const b = (data as { start_at: string; proposed_start_at: string | null; duration_min: number; distance_km: number; service: string }[] | null)?.[0];
    if (b?.proposed_start_at) {
      const settings = await getSettings();
      const start = Date.parse(b.proposed_start_at);
      const own = Date.parse(b.start_at);
      const service = parseService(b.service);
      const busy = (await getBusyWithCharging(start - 12 * 3600_000, start + 24 * 3600_000, settings)).filter((x) => !(x.kind === "booking" && x.start === own));
      const err = checkStart(start, b.duration_min, Date.now(), busy, { ...settings, min_notice_minutes: 0 }, {
        endByClose: service !== "course",
        km: serviceKm(service, Number(b.distance_km), b.duration_min, settings),
      });
      if (err) return jsonError(`${SLOT_ERROR_MESSAGES[err]} Contactez-nous sur WhatsApp.`, 409);
    }
  }

  const { data, error } = await db.rpc("luxus_respond_proposal", { p_token: token, p_reference: reference, p_phone: phone, p_accept: accept });
  if (error) {
    console.error("respond", error);
    return jsonError("Service momentanément indisponible.", 503);
  }
  if (data !== "accepted" && data !== "declined") {
    const [m, st] = MESSAGES[data as string] ?? ["Réponse impossible.", 400];
    return jsonError(m, st);
  }
  return NextResponse.json({ ok: true, result: data });
}
