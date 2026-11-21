import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").toUpperCase();
  const k = url.searchParams.get("k") ?? "";
  if (!/^LA-\d{4,}$/.test(ref) || !/^[a-f0-9]{16,64}$/.test(k)) return jsonError("Lien de suivi invalide.", 400);
  const { data, error } = await supabasePublic().rpc("luxus_track", { p_token: SERVER_RPC_TOKEN(), p_reference: ref, p_tracking: k });
  if (error) {
    console.error("suivi", error);
    return jsonError("Service momentanément indisponible.", 503);
  }
  const row = (data as unknown[])[0];
  if (!row) return jsonError("Lien de suivi invalide.", 404);
  return NextResponse.json(row, { headers: { "Cache-Control": "no-store" } });
}
