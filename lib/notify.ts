import "server-only";
import { formatSenegalPhone } from "./phone";
import { formatFcfa } from "./pricing";
import { dakarTime, formatDateLong } from "./time";

interface NewBooking {
  reference: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  dropoff_address: string;
  start_at: string;
  estimated_price: number;
  passengers: number;
}

/**
 * Prévient l'admin d'une nouvelle réservation. Ne bloque jamais la réservation :
 * toute erreur est seulement journalisée.
 * - ntfy.sh (gratuit, sans compte) si un sujet est configuré dans les réglages ;
 * - WhatsApp Cloud API (Meta) si les variables WHATSAPP_* sont définies.
 */
export async function notifyNewBooking(b: NewBooking, ntfyTopic: string | null, siteUrl: string) {
  const start = Date.parse(b.start_at);
  const when = `${formatDateLong(start)} à ${dakarTime(start).replace(":", "h")}`;
  const body = [
    `${b.customer_name} · ${formatSenegalPhone(b.customer_phone)}`,
    when,
    `${b.pickup_address} → ${b.dropoff_address}`,
    `${b.passengers} pass. · ${formatFcfa(b.estimated_price)}`,
  ].join("\n");

  const jobs: Promise<unknown>[] = [];

  if (ntfyTopic) {
    jobs.push(
      fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic)}`, {
        method: "POST",
        headers: {
          Title: `Nouvelle reservation ${b.reference}`,
          Tags: "oncoming_automobile",
          Click: `${siteUrl}/admin#${b.reference}`,
          Priority: "high",
        },
        body,
        signal: AbortSignal.timeout(4000),
      }),
    );
  }

  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const waTo = process.env.WHATSAPP_NOTIFY_TO; // numéro de l'admin, chiffres uniquement (ex. 221772966462)
  if (waToken && waPhoneId && waTo) {
    // Message hors fenêtre de 24 h : nécessite un modèle approuvé par Meta (voir README)
    const template = process.env.WHATSAPP_TEMPLATE || "nouvelle_reservation";
    jobs.push(
      fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: waTo,
          type: "template",
          template: {
            name: template,
            language: { code: "fr" },
            components: [
              {
                type: "body",
                parameters: [b.reference, b.customer_name, when, b.pickup_address, formatFcfa(b.estimated_price)].map(
                  (text) => ({ type: "text", text }),
                ),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(5000),
      }),
    );
  }

  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error("notifyNewBooking", r.reason);
}
