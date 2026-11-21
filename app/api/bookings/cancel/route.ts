import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { normalizeSenegalPhone } from "@/lib/phone";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, [string, number]> = {
  not_found: ["Aucune réservation trouvée avec ces informations.", 404],
  not_cancellable: ["Cette réservation ne peut plus être annulée.", 409],
  too_late: ["L'heure de la course est passée : contactez-nous sur WhatsApp.", 409],
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reference = str(body.reference, 20).toUpperCase();
  const phone = normalizeSenegalPhone(str(body.phone, 30));
  if (!/^LA-\d{4,}$/.test(reference) || !phone) return jsonError("Numéro de réservation ou téléphone invalide.");

  const { data, error } = await supabasePublic().rpc("public_cancel_booking", {
    p_token: SERVER_RPC_TOKEN(),
    p_reference: reference,
    p_phone: phone,
  });
  if (error) {
    console.error("cancel", error);
    return jsonError("Service momentanément indisponible.", 503);
  }
  if (data !== "cancelled") {
    const [msg, status] = MESSAGES[data as string] ?? ["Annulation impossible.", 400];
    return jsonError(msg, status);
  }
  return NextResponse.json({ ok: true });
}
