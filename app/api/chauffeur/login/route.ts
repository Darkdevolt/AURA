import { NextResponse } from "next/server";
import { hashPin, setDriverSession } from "@/lib/driver-auth";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { normalizeSenegalPhone } from "@/lib/phone";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const phone = normalizeSenegalPhone(str(body.phone, 30));
  const pin = str(body.pin, 12);
  if (!phone || !/^\d{4,8}$/.test(pin)) return jsonError("Téléphone ou code invalide.");
  // Ralentit les essais en série
  await new Promise((r) => setTimeout(r, 400));
  const { data, error } = await supabasePublic().rpc("luxus_driver_login", {
    p_token: SERVER_RPC_TOKEN(),
    p_phone: phone,
    p_pin_hash: hashPin(phone, pin),
  });
  if (error) return jsonError("Service momentanément indisponible.", 503);
  const driver = (data as { id: string; name: string }[])[0];
  if (!driver) return jsonError("Téléphone ou code incorrect.", 401);
  await setDriverSession(driver.id, driver.name);
  return NextResponse.json({ name: driver.name });
}
