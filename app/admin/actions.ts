"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeSenegalPhone } from "@/lib/phone";
import { requireAdmin, supabaseSession } from "@/lib/supabase/server";
import { dakarToUtc } from "@/lib/time";
import type { BookingStatus, PaymentMethod } from "@/lib/types";

export type ActionResult = { ok: boolean; message: string };

const STATUSES: BookingStatus[] = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
const PAYMENTS: PaymentMethod[] = ["cash", "wave", "orange_money"];

async function admin() {
  const a = await requireAdmin();
  if (!a) throw new Error("Accès refusé");
  return a.supabase;
}

export async function updateBooking(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await admin();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as BookingStatus;
  const priceRaw = String(form.get("final_price") ?? "").replace(/\s/g, "");
  const payment = String(form.get("payment_method") ?? "");
  if (!STATUSES.includes(status)) return { ok: false, message: "Statut invalide." };
  const final_price = priceRaw === "" ? null : Number(priceRaw);
  if (final_price !== null && (!Number.isInteger(final_price) || final_price < 0))
    return { ok: false, message: "Prix invalide." };
  const payment_method = payment === "" ? null : (payment as PaymentMethod);
  if (payment_method && !PAYMENTS.includes(payment_method)) return { ok: false, message: "Moyen de paiement invalide." };

  const { error } = await supabase.from("bookings").update({ status, final_price, payment_method }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin");
  return { ok: true, message: "Enregistré." };
}

export async function createBlock(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await admin();
  const date = String(form.get("date"));
  const endDate = String(form.get("end_date") || date);
  const allDay = form.get("all_day") === "on";
  const startTime = allDay ? "00:00" : String(form.get("start_time"));
  const endTime = allDay ? "23:59" : String(form.get("end_time"));
  const reason = String(form.get("reason") ?? "").slice(0, 200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime))
    return { ok: false, message: "Date ou heure invalide." };
  const start_at = new Date(dakarToUtc(date, startTime)).toISOString();
  const end_at = new Date(dakarToUtc(endDate, endTime)).toISOString();
  if (end_at <= start_at) return { ok: false, message: "La fin doit être après le début." };
  const { error } = await supabase.from("blocked_slots").insert({ start_at, end_at, reason: reason || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/plages");
  return { ok: true, message: "Plage bloquée ajoutée." };
}

export async function deleteBlock(form: FormData) {
  const supabase = await admin();
  await supabase.from("blocked_slots").delete().eq("id", String(form.get("id")));
  revalidatePath("/admin/plages");
}

const INT_FIELDS = [
  "pickup_fee", "price_per_km", "min_fare", "round_to", "airport_fixed_price", "slot_minutes",
  "approach_minutes", "margin_minutes", "min_notice_minutes", "max_days_ahead", "vehicles",
  "max_active_per_phone", "max_per_ip_per_day",
] as const;

export async function updateSettings(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await admin();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of INT_FIELDS) {
    const v = Number(String(form.get(f) ?? "").replace(/\s/g, ""));
    if (!Number.isInteger(v) || v < 0) return { ok: false, message: `Valeur invalide pour « ${f} ».` };
    patch[f] = v;
  }
  if ((patch.vehicles as number) < 1) return { ok: false, message: "Il faut au moins 1 véhicule." };
  if ((patch.slot_minutes as number) < 5) return { ok: false, message: "Créneau trop court." };
  patch.airport_enabled = form.get("airport_enabled") === "on";
  const open = String(form.get("open_time"));
  const close = String(form.get("close_time"));
  if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close) || open >= close)
    return { ok: false, message: "Horaires invalides." };
  patch.open_time = open;
  patch.close_time = close;
  patch.open_days = form.getAll("open_days").map(Number).filter((d) => d >= 0 && d <= 6);
  const wa = normalizeSenegalPhone(String(form.get("whatsapp_number")));
  const tel = normalizeSenegalPhone(String(form.get("phone_number")));
  if (!wa || !tel) return { ok: false, message: "Numéro WhatsApp ou téléphone invalide (+221 7X XXX XX XX)." };
  patch.whatsapp_number = wa;
  patch.phone_number = tel;

  const { error } = await supabase.from("settings").update(patch).eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Réglages enregistrés." };
}

export async function signOut() {
  const supabase = await supabaseSession();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
