import { NextResponse } from "next/server";
import { getDriverSession } from "@/lib/driver-auth";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await getDriverSession();
  if (!me) return jsonError("Session expirée.", 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const price = body.final_price === null || body.final_price === undefined || body.final_price === "" ? null : Number(body.final_price);
  if (price !== null && (!Number.isInteger(price) || price < 0 || price > 10_000_000)) return jsonError("Prix invalide.");
  const pm = str(body.payment_method, 20);
  if (pm && !["cash", "wave", "orange_money"].includes(pm)) return jsonError("Moyen de paiement invalide.");
  const { data, error } = await supabasePublic().rpc("luxus_driver_update", {
    p_token: SERVER_RPC_TOKEN(),
    p_driver: me.id,
    p_booking: str(body.booking_id, 40),
    p_status: str(body.status, 20),
    p_final_price: price,
    p_payment_method: pm,
  });
  if (error) return jsonError("Service indisponible.", 503);
  if (data === "too_early") return jsonError("Attendez la fin du délai d'attente avant de déclarer le client absent.", 409);
  if (data !== "ok") return jsonError("Mise à jour impossible.", 409);
  return NextResponse.json({ ok: true });
}
