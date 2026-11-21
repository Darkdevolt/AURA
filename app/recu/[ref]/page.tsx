import type { Metadata } from "next";
import Logo from "@/components/Logo";
import ReceiptActions from "@/components/ReceiptActions";
import { SERVER_RPC_TOKEN, SITE_URL } from "@/lib/env";
import { formatSenegalPhone, validLines } from "@/lib/phone";
import { formatFcfa } from "@/lib/pricing";
import { getSettings } from "@/lib/server-data";
import { SERVICE_LABELS } from "@/lib/service";
import { supabasePublic } from "@/lib/supabase/server";
import { dakarDate, dakarTime, formatDateLong } from "@/lib/time";
import { PAYMENT_LABELS, STATUS_LABELS, type BookingStatus, type PaymentMethod, type ServiceKind } from "@/lib/types";

export const metadata: Metadata = { title: "Reçu", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Receipt {
  reference: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_note: string | null;
  dropoff_address: string;
  start_at: string;
  passengers: number;
  distance_km: number;
  duration_min: number;
  estimated_price: number;
  final_price: number | null;
  payment_method: PaymentMethod | null;
  paid_online: boolean;
  status: BookingStatus;
  service: ServiceKind | null;
  driver_name: string | null;
  vehicle_name: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
}

const fr = (ms: number) => `${dakarDate(ms).split("-").reverse().join("/")} à ${dakarTime(ms).replace(":", "h")}`;

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-[14px]">
      <dt className="text-neutral-500">{k}</dt>
      <dd className={`text-right ${strong ? "font-bold" : ""}`}>{v}</dd>
    </div>
  );
}

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ k?: string }> }) {
  const { ref } = await params;
  const { k } = await searchParams;
  let r: Receipt | undefined;
  if (k && /^[a-f0-9]{16,64}$/.test(k)) {
    const { data } = await supabasePublic().rpc("luxus_receipt", { p_token: SERVER_RPC_TOKEN(), p_reference: ref.toUpperCase(), p_tracking: k });
    r = (data as Receipt[] | null)?.[0];
  }
  if (!r) {
    return <div className="wrap py-16"><p className="alert-error">Reçu introuvable : vérifiez le lien reçu par WhatsApp.</p></div>;
  }
  const settings = await getSettings();
  const lines = validLines(settings.contact_lines);
  const paid = r.status === "completed";
  const amount = paid ? (r.final_price ?? r.estimated_price) : r.estimated_price;
  const start = Date.parse(r.start_at);
  const service = (r.service ?? "course") as ServiceKind;
  const url = `${SITE_URL()}/recu/${r.reference}?k=${k}`;
  const vehicle = [r.vehicle_name, r.vehicle_model, r.vehicle_plate].filter(Boolean).join(" · ");

  return (
    <div className="wrap max-w-xl space-y-5 py-8 print:py-0">
      <article className="border border-line bg-white print:border-0">
        <header className="flex items-start justify-between gap-4 bg-ink-grad p-5 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-light">
              {paid ? "Reçu de paiement" : "Confirmation de réservation"}
            </p>
            <p className="font-brand mt-2 text-2xl">{r.reference}</p>
            <p className="mt-1 text-xs text-neutral-400">{paid ? `Course du ${fr(start)}` : `Réservé le ${fr(Date.parse(r.created_at))}`}</p>
          </div>
          <Logo variant="full" height={70} alt="Luxus Asaad" />
        </header>
        <div aria-hidden className="gold-rule" />

        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold">{r.customer_name}</p>
            <span className={`border px-2 py-0.5 text-[11px] font-bold uppercase ${paid ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-line"}`}>
              {paid ? "Payé" : STATUS_LABELS[r.status]}
            </span>
          </div>
          <dl>
            <Row k="Prestation" v={SERVICE_LABELS[service]} />
            <Row k="Date" v={<span className="capitalize">{formatDateLong(start)} à {dakarTime(start).replace(":", "h")}</span>} />
            <Row k="Départ" v={<>{r.pickup_address}{r.pickup_note ? <span className="block text-neutral-500">{r.pickup_note}</span> : null}</>} />
            <Row k={service === "course" ? "Destination" : "Programme"} v={r.dropoff_address} />
            {service === "course" ? <Row k="Distance" v={`${Number(r.distance_km).toLocaleString("fr-FR")} km`} /> : <Row k="Durée" v={`${Math.round(r.duration_min / 60)} h`} />}
            <Row k="Passagers" v={r.passengers} />
            {r.driver_name && <Row k="Chauffeur" v={r.driver_name} />}
            {vehicle && <Row k="Véhicule" v={vehicle} />}
            <Row k="Téléphone" v={formatSenegalPhone(r.customer_phone)} />
          </dl>
          <div className="flex items-end justify-between border-t-2 border-ink pt-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em]">{paid ? "Montant payé" : service === "course" ? "Prix estimé" : "Forfait"}</p>
              {paid && r.payment_method && <p className="text-xs text-neutral-500">Réglé par {PAYMENT_LABELS[r.payment_method]}{r.paid_online ? " (en ligne)" : ""}</p>}
              {!paid && <p className="text-xs text-neutral-500">À régler à la fin de la course : espèces, Wave ou Orange Money</p>}
            </div>
            <p className="font-brand text-2xl tabular-nums">{formatFcfa(amount)}</p>
          </div>
        </div>
        <footer className="border-t border-line px-5 py-4 text-[11px] leading-relaxed text-neutral-500">
          <p className="font-semibold text-ink">Luxus Asaad — VTC électrique · Dakar, Sénégal</p>
          <p>{lines.map((l) => `${l.label} : ${formatSenegalPhone(l.phone)}`).join(" · ")}</p>
          <p>{SITE_URL().replace("https://", "")} · Merci de votre confiance.</p>
        </footer>
      </article>
      <ReceiptActions url={url} phone={r.customer_phone} reference={r.reference} />
    </div>
  );
}
