import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { normalizeSenegalPhone } from "@/lib/phone";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Historique d'un client : prouvé par un numéro de réservation + le téléphone. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const reference = str(body.reference, 20).toUpperCase();
  const phone = normalizeSenegalPhone(str(body.phone, 30));
  if (!/^LA-\d{4,}$/.test(reference) || !phone) return jsonError("Numéro de réservation ou téléphone invalide.");
  const { data, error } = await supabasePublic().rpc("luxus_customer_bookings", {
    p_token: SERVER_RPC_TOKEN(),
    p_reference: reference,
    p_phone: phone,
  });
  if (error) {
    console.error("client bookings", error);
    return jsonError("Service momentanément indisponible.", 503);
  }
  return NextResponse.json({ bookings: data ?? [] });
}
