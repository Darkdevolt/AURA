import { NextResponse } from "next/server";
import { SERVER_RPC_TOKEN } from "@/lib/env";
import { estimateRoute, isInSenegal } from "@/lib/geo";
import { clientIpHash, jsonError, parseLatLng, str } from "@/lib/http";
import { normalizeSenegalPhone } from "@/lib/phone";
import { computePrice } from "@/lib/pricing";
import { getBusy, getSettings } from "@/lib/server-data";
import { blockMinutes, checkStart, SLOT_ERROR_MESSAGES } from "@/lib/slots";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, [string, number]> = {
  slot_unavailable: [SLOT_ERROR_MESSAGES.unavailable, 409],
  limit_phone: ["Vous avez déjà plusieurs réservations en cours avec ce numéro. Contactez-nous sur WhatsApp.", 429],
  limit_ip: ["Trop de réservations depuis cette connexion. Contactez-nous sur WhatsApp.", 429],
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Requête invalide.");
  }

  // Pot de miel anti-robots : champ caché qui doit rester vide
  if (str(body.website, 200)) return jsonError("Requête refusée.", 400);

  const name = str(body.customer_name, 80);
  const phone = normalizeSenegalPhone(str(body.customer_phone, 30));
  const pickup = parseLatLng(body.pickup);
  const dropoff = parseLatLng(body.dropoff);
  const pickupAddress = str(body.pickup_address, 300);
  const dropoffAddress = str(body.dropoff_address, 300);
  const passengers = Number(body.passengers);
  const startAt = Date.parse(str(body.start_at, 40));

  if (name.length < 2) return jsonError("Merci d'indiquer votre prénom.");
  if (!phone) return jsonError("Numéro de téléphone sénégalais invalide (ex. +221 77 123 45 67).");
  if (!pickup || !dropoff || !isInSenegal(pickup) || !isInSenegal(dropoff) || !pickupAddress || !dropoffAddress)
    return jsonError("Merci de préciser le départ et la destination.");
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 4)
    return jsonError("Le nombre de passagers doit être compris entre 1 et 4.");
  if (!isFinite(startAt)) return jsonError("Merci de choisir un créneau.");

  try {
    const settings = await getSettings();
    // Le prix et la durée sont recalculés côté serveur (jamais pris du navigateur)
    const route = await estimateRoute(pickup, dropoff);
    const { price } = computePrice(route.distanceKm, settings, pickup, dropoff);
    const blockedUntil = startAt + blockMinutes(route.durationMin, settings) * 60_000;

    const busy = await getBusy(startAt - 12 * 3600_000, blockedUntil);
    const err = checkStart(startAt, route.durationMin, Date.now(), busy, settings);
    if (err) return jsonError(SLOT_ERROR_MESSAGES[err], 409);

    const { data, error } = await supabasePublic().rpc("public_create_booking", {
      p_token: SERVER_RPC_TOKEN(),
      p_customer_name: name,
      p_customer_phone: phone,
      p_pickup_address: pickupAddress,
      p_pickup_lat: pickup.lat,
      p_pickup_lng: pickup.lng,
      p_pickup_note: str(body.pickup_note, 300),
      p_dropoff_address: dropoffAddress,
      p_dropoff_lat: dropoff.lat,
      p_dropoff_lng: dropoff.lng,
      p_start_at: new Date(startAt).toISOString(),
      p_blocked_until: new Date(blockedUntil).toISOString(),
      p_passengers: passengers,
      p_comment: str(body.comment, 500),
      p_distance_km: route.distanceKm,
      p_duration_min: route.durationMin,
      p_estimated_price: price,
      p_ip_hash: clientIpHash(req),
    });

    if (error) {
      const known = Object.keys(ERRORS).find((k) => error.message.includes(k));
      if (known) return jsonError(ERRORS[known][0], ERRORS[known][1]);
      console.error("create_booking", error);
      return jsonError("La réservation n'a pas pu être enregistrée. Réessayez dans un instant.", 500);
    }

    const row = (data as { reference: string }[])[0];
    return NextResponse.json({
      reference: row.reference,
      customer_name: name,
      customer_phone: phone,
      pickup_address: pickupAddress,
      pickup_note: str(body.pickup_note, 300) || null,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      dropoff_address: dropoffAddress,
      start_at: new Date(startAt).toISOString(),
      passengers,
      comment: str(body.comment, 500) || null,
      distance_km: route.distanceKm,
      duration_min: route.durationMin,
      estimated_price: price,
      whatsapp_number: settings.whatsapp_number,
    });
  } catch (e) {
    console.error("bookings POST", e);
    return jsonError("Service momentanément indisponible. Réessayez dans un instant.", 503);
  }
}
