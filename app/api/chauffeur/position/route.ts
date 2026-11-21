import { NextResponse } from "next/server";
import { getDriverSession } from "@/lib/driver-auth";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { isInSenegal } from "@/lib/geo";
import { jsonError, parseLatLng, str } from "@/lib/http";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await getDriverSession();
  if (!me) return jsonError("Session expirée.", 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const p = parseLatLng(body);
  if (!p || !isInSenegal(p)) return jsonError("Position invalide.");
  const { data, error } = await supabasePublic().rpc("luxus_driver_position", {
    p_token: SERVER_RPC_TOKEN(),
    p_driver: me.id,
    p_booking: str(body.booking_id, 40),
    p_lat: p.lat,
    p_lng: p.lng,
  });
  if (error) return jsonError("Service indisponible.", 503);
  return NextResponse.json({ ok: data === "ok" });
}
