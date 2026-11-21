import { NextResponse } from "next/server";
import { getDriverSession } from "@/lib/driver-auth";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { supabasePublic } from "@/lib/supabase/server";
import { addDays, dakarDate, dakarToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getDriverSession();
  if (!me) return jsonError("Session expirée.", 401);
  const today = dakarDate(Date.now());
  const { data, error } = await supabasePublic().rpc("luxus_driver_bookings", {
    p_token: SERVER_RPC_TOKEN(),
    p_driver: me.id,
    p_from: new Date(dakarToUtc(today, "00:00")).toISOString(),
    p_to: new Date(dakarToUtc(addDays(today, 8), "00:00")).toISOString(),
  });
  if (error) return jsonError(error.code === "42501" ? "Accès refusé." : "Service indisponible.", error.code === "42501" ? 401 : 503);
  return NextResponse.json({ driver: me, bookings: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
