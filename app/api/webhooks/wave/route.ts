import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { supabasePublic } from "@/lib/supabase/server";
import { verifyWaveSignature } from "@/lib/wave";

export const dynamic = "force-dynamic";

/** Webhook Wave : marque la réservation payée quand le paiement est confirmé. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWaveSignature(req.headers.get("wave-signature"), raw)) {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }
  const event = JSON.parse(raw) as {
    type?: string;
    data?: { id?: string; client_reference?: string; amount?: string; payment_status?: string };
  };
  if (event.type === "checkout.session.completed" && event.data?.client_reference && event.data.payment_status !== "cancelled") {
    const { error } = await supabasePublic().rpc("luxus_mark_paid", {
      p_token: SERVER_RPC_TOKEN(),
      p_reference: event.data.client_reference,
      p_amount: Math.round(Number(event.data.amount) || 0),
      p_session: event.data.id ?? "",
    });
    if (error) {
      console.error("wave webhook", error);
      return NextResponse.json({ error: "erreur" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
