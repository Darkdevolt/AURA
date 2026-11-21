"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SETTINGS_TAG } from "@/lib/server-data";
import { redirect } from "next/navigation";
import { normalizeSenegalPhone } from "@/lib/phone";
import { requireAdmin, supabaseSession } from "@/lib/supabase/server";
import { dakarToUtc } from "@/lib/time";
import { hashPin } from "@/lib/driver-auth";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, type BookingStatus, type PaymentMethod } from "@/lib/types";

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

  const patch: Record<string, unknown> = { status, final_price, payment_method };
  if (form.has("vehicle_id")) patch.vehicle_id = String(form.get("vehicle_id")) || null;
  if (form.has("driver_id")) patch.driver_id = String(form.get("driver_id")) || null;
  const { error } = await supabase.from("luxus_bookings").update(patch).eq("id", id);
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
  const { error } = await supabase.from("luxus_blocked_slots").insert({ start_at, end_at, reason: reason || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/plages");
  return { ok: true, message: "Plage bloquée ajoutée." };
}

export async function deleteBlock(form: FormData) {
  const supabase = await admin();
  await supabase.from("luxus_blocked_slots").delete().eq("id", String(form.get("id")));
  revalidatePath("/admin/plages");
}

const INT_FIELDS = [
  "pickup_fee", "price_per_km", "min_fare", "round_to", "airport_fixed_price", "slot_minutes",
  "approach_minutes", "margin_minutes", "min_notice_minutes", "max_days_ahead",
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
  if ((patch.slot_minutes as number) < 5) return { ok: false, message: "Créneau trop court." };
  patch.airport_enabled = form.get("airport_enabled") === "on";
  const open = String(form.get("open_time"));
  const close = String(form.get("close_time"));
  if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close) || open >= close)
    return { ok: false, message: "Horaires invalides." };
  patch.open_time = open;
  patch.close_time = close;
  patch.open_days = form.getAll("open_days").map(Number).filter((d) => d >= 0 && d <= 6);

  const lines = [];
  for (let i = 0; i < 4; i++) {
    const label = String(form.get(`line_label_${i}`) ?? "").trim().slice(0, 40);
    const raw = String(form.get(`line_phone_${i}`) ?? "").trim();
    if (!label && !raw) continue;
    const phone = normalizeSenegalPhone(raw);
    if (!label || !phone) return { ok: false, message: `Ligne ${i + 1} : nom ou numéro invalide (+221 7X XXX XX XX).` };
    lines.push({ label, phone, whatsapp: form.get(`line_wa_${i}`) === "on" });
  }
  if (!lines.length) return { ok: false, message: "Ajoutez au moins une ligne téléphonique." };
  if (!lines.some((l) => l.whatsapp))
    return { ok: false, message: "Cochez « WhatsApp » sur au moins une ligne : c'est elle qui reçoit les réservations." };
  patch.contact_lines = lines;
  patch.phone_number = lines[0].phone;
  patch.whatsapp_number = lines.find((l) => l.whatsapp)!.phone;
  const topic = String(form.get("ntfy_topic") ?? "").trim();
  if (topic && !/^[A-Za-z0-9_-]{8,64}$/.test(topic)) return { ok: false, message: "Sujet de notification invalide (8 à 64 lettres, chiffres, - ou _)." };
  patch.ntfy_topic = topic || null;

  const { error } = await supabase.from("luxus_settings").update(patch).eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidateTag(SETTINGS_TAG, "max");
  revalidatePath("/", "layout");
  return { ok: true, message: "Réglages enregistrés." };
}

export async function signOut() {
  const supabase = await supabaseSession();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Flotte : véhicules et chauffeurs
// ---------------------------------------------------------------------------
const intOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/\s/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

export async function saveVehicle(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await admin();
  const id = String(form.get("id") ?? "");
  const name = text(form.get("name"), 40);
  if (!name) return { ok: false, message: "Donnez un nom au véhicule (ex. Asaad 2)." };
  const purchase_price = intOrNull(form.get("purchase_price"));
  if (Number.isNaN(purchase_price)) return { ok: false, message: "Prix d'achat invalide." };
  const date = String(form.get("purchase_date") ?? "");
  const row = {
    name,
    plate: text(form.get("plate"), 20),
    model: text(form.get("model"), 60),
    color: text(form.get("color"), 30),
    purchase_price,
    purchase_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    active: form.get("active") === "on",
  };
  const { error } = id
    ? await supabase.from("luxus_vehicles").update(row).eq("id", id)
    : await supabase.from("luxus_vehicles").insert(row);
  if (error) return { ok: false, message: error.message };
  revalidateTag(SETTINGS_TAG, "max");
  revalidatePath("/admin", "layout");
  return { ok: true, message: id ? "Véhicule mis à jour." : "Véhicule ajouté." };
}

export async function saveDriver(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await admin();
  const id = String(form.get("id") ?? "");
  const name = text(form.get("name"), 60);
  const phone = normalizeSenegalPhone(String(form.get("phone") ?? ""));
  if (!name || !phone) return { ok: false, message: "Nom et téléphone sénégalais obligatoires." };
  const pin = String(form.get("pin") ?? "").trim();
  if (pin && !/^\d{4,8}$/.test(pin)) return { ok: false, message: "Le code doit contenir 4 à 8 chiffres." };
  if (!id && !pin) return { ok: false, message: "Choisissez un code (4 à 8 chiffres) pour le chauffeur." };
  const row: Record<string, unknown> = {
    name,
    phone,
    vehicle_id: String(form.get("vehicle_id") ?? "") || null,
    active: form.get("active") === "on",
  };
  if (pin) row.pin_hash = hashPin(phone, pin);
  const { error } = id
    ? await supabase.from("luxus_drivers").update(row).eq("id", id)
    : await supabase.from("luxus_drivers").insert(row);
  if (error) return { ok: false, message: error.code === "23505" ? "Ce numéro est déjà utilisé par un chauffeur." : error.message };
  revalidatePath("/admin", "layout");
  return { ok: true, message: id ? "Chauffeur mis à jour." : "Chauffeur ajouté." };
}

// ---------------------------------------------------------------------------
// Finances : dépenses et revenus
// ---------------------------------------------------------------------------
const MONEY = ["cash", "wave", "orange_money", "carte", "autre"];

export async function saveEntry(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const supabase = await admin();
  const kind = String(form.get("kind"));
  const date = String(form.get("date") ?? "");
  const amount = intOrNull(form.get("amount"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Date invalide." };
  if (!amount || Number.isNaN(amount)) return { ok: false, message: "Montant invalide." };
  const pm = String(form.get("payment_method") ?? "");
  const common = {
    vehicle_id: String(form.get("vehicle_id") ?? "") || null,
    amount,
    payment_method: MONEY.includes(pm) ? pm : null,
    note: text(form.get("note"), 500),
    receipt_path: text(form.get("receipt_path"), 300),
  };
  const scanned = form.get("scanned") === "1";
  if (kind === "depense") {
    const category = String(form.get("category"));
    if (!(category in EXPENSE_CATEGORIES)) return { ok: false, message: "Catégorie invalide." };
    const km = intOrNull(form.get("odometer_km"));
    const { error } = await supabase.from("luxus_expenses").insert({
      ...common,
      spent_on: date,
      category,
      supplier: text(form.get("supplier"), 120),
      odometer_km: Number.isNaN(km) ? null : km,
      source: scanned ? "scan" : "manuel",
    });
    if (error) return { ok: false, message: error.message };
  } else if (kind === "revenu") {
    const source = String(form.get("source"));
    if (!(source in INCOME_SOURCES)) return { ok: false, message: "Source invalide." };
    const trips = intOrNull(form.get("trips"));
    const { error } = await supabase.from("luxus_incomes").insert({
      ...common,
      earned_on: date,
      source,
      trips: trips === null || Number.isNaN(trips) ? 1 : trips,
      source_kind: scanned ? "scan" : "manuel",
    });
    if (error) return { ok: false, message: error.message };
  } else {
    return { ok: false, message: "Type invalide." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: kind === "depense" ? "Dépense enregistrée." : "Revenu enregistré." };
}

export async function deleteEntry(form: FormData) {
  const supabase = await admin();
  const table = form.get("kind") === "revenu" ? "luxus_incomes" : "luxus_expenses";
  const id = String(form.get("id"));
  const { data } = await supabase.from(table).select("receipt_path").eq("id", id).single();
  await supabase.from(table).delete().eq("id", id);
  if (data?.receipt_path) await supabase.storage.from("luxus-receipts").remove([data.receipt_path]);
  revalidatePath("/admin", "layout");
}
