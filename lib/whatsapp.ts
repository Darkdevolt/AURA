import { googleMapsLink } from "./geo";
import { formatSenegalPhone, waDigits } from "./phone";
import { formatFcfa } from "./pricing";
import { formatDateLong, dakarTime } from "./time";

export function waLink(phone: string, text?: string): string {
  return `https://wa.me/${waDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export interface BookingSummary {
  reference: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_note?: string | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  start_at: string;
  passengers: number;
  estimated_price: number;
  comment?: string | null;
  tracking_url?: string;
}

export function bookingWhatsAppMessage(b: BookingSummary): string {
  const start = Date.parse(b.start_at);
  return [
    `Bonjour Luxus Asaad, voici ma réservation :`,
    ``,
    `N° : ${b.reference}`,
    `Nom : ${b.customer_name}`,
    `Téléphone : ${formatSenegalPhone(b.customer_phone)}`,
    `Départ : ${b.pickup_address}${b.pickup_note ? ` (${b.pickup_note})` : ""}`,
    `Destination : ${b.dropoff_address}`,
    `Date : ${formatDateLong(start)}`,
    `Heure : ${dakarTime(start).replace(":", "h")}`,
    `Passagers : ${b.passengers}`,
    `Prix estimé : ${formatFcfa(b.estimated_price)}`,
    b.comment ? `Commentaire : ${b.comment}` : null,
    `Point de départ : ${googleMapsLink({ lat: b.pickup_lat, lng: b.pickup_lng })}`,
    b.tracking_url ? `Suivi du chauffeur : ${b.tracking_url}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
