import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/env";
import { jsonError, str } from "@/lib/http";
import { requireAdmin } from "@/lib/supabase/server";
import { createWaveCheckout, waveEnabled } from "@/lib/wave";

export const dynamic = "force-dynamic";

/** Crée un lien de paiement Wave pour une réservation (admin). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Accès refusé.", 401);
  if (!waveEnabled()) return jsonError("Paiement Wave non configuré (WAVE_API_KEY manquante).", 501);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { data: b } = await admin.supabase
    .from("luxus_bookings")
    .select("id, reference, final_price, estimated_price")
    .eq("id", str(body.booking_id, 40))
    .single();
  if (!b) return jsonError("Réservation introuvable.", 404);
  try {
    const amount = b.final_price ?? b.estimated_price;
    const session = await createWaveCheckout({ amount, reference: b.reference, siteUrl: SITE_URL() });
    await admin.supabase.from("luxus_bookings").update({ wave_session_id: session.id }).eq("id", b.id);
    return NextResponse.json({ url: session.url, amount });
  } catch (e) {
    console.error("wave", e);
    return jsonError("Wave n'a pas pu créer le lien de paiement.", 502);
  }
}
