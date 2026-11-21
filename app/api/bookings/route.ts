import { after, NextResponse } from "next/server";
import { SERVER_RPC_TOKEN, SITE_URL } from "@/lib/env";
import { notifyNewBooking } from "@/lib/notify";
import { estimateRoute, isInSenegal } from "@/lib/geo";
import { clientIpHash, jsonError, parseLatLng, str } from "@/lib/http";
import { bookingWhatsApp, normalizeSenegalPhone } from "@/lib/phone";
import { getBusyWithCharging, getSettings } from "@/lib/server-data";
import { disposalMinutes, isDisposal, parseService, serviceEnabled, serviceKm, servicePrice, SERVICE_LABELS } from "@/lib/service";
import { blockMinutes, checkStart, SLOT_ERROR_MESSAGES } from "@/lib/slots";
import { supabasePublic } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, [string, number]> = {
  slot_unavailable: [SLOT_ERROR_MESSAGES.unavailable, 409],
  limit_phone: ["Vous avez déjà plusieurs réservations en cours avec ce numéro. Contactez-nous sur WhatsApp.", 429],
  limit_ip: ["Trop de réservations depuis cette connexion. Contactez-nous sur WhatsApp.", 429],
  limit_noshow: ["Suite à des rendez-vous manqués, merci de nous appeler pour réserver : nous serons ravis de vous aider.", 403],
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

  const service = parseService(body.service);
  const disposal = isDisposal(service);
  const name = str(body.customer_name, 80);
  const phone = normalizeSenegalPhone(str(body.customer_phone, 30));
  const pickup = parseLatLng(body.pickup);
  // Mise à disposition : destination libre (programme décidé avec le chauffeur)
  const dropoff = disposal ? (parseLatLng(body.dropoff) ?? pickup) : parseLatLng(body.dropoff);
  const pickupAddress = str(body.pickup_address, 300);
  const dropoffAddress = str(body.dropoff_address, 300) || (disposal ? `${SERVICE_LABELS[service]} — programme libre` : "");
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
    // Le prix et la durée sont recalculés côté serveur (jamais pris du navigateur)
    const [settings, route] = await Promise.all([
      getSettings(),
      disposal ? Promise.resolve({ distanceKm: 0, durationMin: 0 }) : estimateRoute(pickup, dropoff),
    ]);
    if (!serviceEnabled(service, settings)) return jsonError("Cette prestation n'est pas proposée pour le moment.");
    if (disposal) route.durationMin = disposalMinutes(service, settings);
    const { price } = servicePrice(service, settings, route.distanceKm, pickup, dropoff);
    const blockedUntil = startAt + blockMinutes(route.durationMin, settings) * 60_000;

    const busy = await getBusyWithCharging(startAt - 12 * 3600_000, blockedUntil, settings);
    const km = serviceKm(service, route.distanceKm, route.durationMin, settings);
    const err = checkStart(startAt, route.durationMin, Date.now(), busy, settings, { endByClose: disposal, km });
    if (err) return jsonError(SLOT_ERROR_MESSAGES[err], 409);

    const { data, error } = await supabasePublic().rpc("luxus_create_booking", {
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
      p_service: service,
    });

    if (error) {
      const known = Object.keys(ERRORS).find((k) => error.message.includes(k));
      if (known) return jsonError(ERRORS[known][0], ERRORS[known][1]);
      console.error("create_booking", error);
      return jsonError("La réservation n'a pas pu être enregistrée. Réessayez dans un instant.", 500);
    }

    const row = (data as { reference: string; tracking_token: string }[])[0];
    after(() =>
      notifyNewBooking(
        {
          reference: row.reference,
          customer_name: name,
          customer_phone: phone,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          start_at: new Date(startAt).toISOString(),
          estimated_price: price,
          passengers,
        },
        settings.ntfy_topic,
        SITE_URL(),
      ),
    );
    return NextResponse.json({
      tracking_token: row.tracking_token,
      service,
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
      whatsapp_number: bookingWhatsApp(settings),
    });
  } catch (e) {
    console.error("bookings POST", e);
    return jsonError("Service momentanément indisponible. Réessayez dans un instant.", 503);
  }
}
