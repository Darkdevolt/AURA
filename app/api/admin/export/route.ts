import { requireAdmin } from "@/lib/supabase/server";
import { addDays, dakarDate, dakarTime, dakarToUtc } from "@/lib/time";
import { PAYMENT_LABELS, STATUS_LABELS, type Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new Response("Accès refusé", { status: 401 });
  const url = new URL(req.url);
  const today = dakarDate(Date.now());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("from") ?? "") ? url.searchParams.get("from")! : `${today.slice(0, 8)}01`;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("to") ?? "") ? url.searchParams.get("to")! : today;

  const { data, error } = await admin.supabase
    .from("bookings")
    .select("*")
    .gte("start_at", new Date(dakarToUtc(from, "00:00")).toISOString())
    .lt("start_at", new Date(dakarToUtc(addDays(to, 1), "00:00")).toISOString())
    .order("start_at");
  if (error) return new Response(error.message, { status: 500 });

  const header = [
    "Référence", "Date", "Heure", "Statut", "Client", "Téléphone", "Départ", "Repère", "Destination",
    "Passagers", "Distance (km)", "Durée (min)", "Prix estimé (FCFA)", "Prix payé (FCFA)", "Paiement", "Commentaire", "Créée le",
  ];
  const rows = (data as Booking[]).map((b) => {
    const t = Date.parse(b.start_at);
    return [
      b.reference, dakarDate(t), dakarTime(t), STATUS_LABELS[b.status], b.customer_name, b.customer_phone,
      b.pickup_address, b.pickup_note, b.dropoff_address, b.passengers, String(b.distance_km).replace(".", ","),
      b.duration_min, b.estimated_price, b.final_price, b.payment_method ? PAYMENT_LABELS[b.payment_method] : "",
      b.comment, `${dakarDate(Date.parse(b.created_at))} ${dakarTime(Date.parse(b.created_at))}`,
    ].map(esc).join(";");
  });
  // BOM UTF-8 + point-virgule : s'ouvre directement dans Excel en français
  const csv = "﻿" + [header.join(";"), ...rows].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="luxus-asaad-reservations-${from}-au-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
