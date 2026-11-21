import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { normalizeSenegalPhone } from "@/lib/phone";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reference = str(body.reference, 20).toUpperCase();
  const phone = normalizeSenegalPhone(str(body.phone, 30));
  if (!/^LA-\d{4,}$/.test(reference) || !phone) return jsonError("Numéro de réservation ou téléphone invalide.");

  const { data, error } = await supabasePublic().rpc("luxus_get_booking", {
    p_token: SERVER_RPC_TOKEN(),
    p_reference: reference,
    p_phone: phone,
  });
  if (error) {
    console.error("lookup", error);
    return jsonError("Service momentanément indisponible.", 503);
  }
  const booking = (data as unknown[])[0];
  if (!booking) return jsonError("Aucune réservation trouvée avec ces informations.", 404);
  return NextResponse.json({ booking });
}
