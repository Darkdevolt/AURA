"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { haversineKm } from "@/lib/geo";
import { dakarTime, formatDateLong } from "@/lib/time";
import { STATUS_LABELS, type BookingStatus } from "@/lib/types";

const TrackMap = dynamic(() => import("./TrackMap"), {
  ssr: false,
  loading: () => <div className="flex h-80 items-center justify-center border border-line bg-neutral-100 text-sm text-neutral-500">Chargement de la carte…</div>,
});

interface Track {
  reference: string;
  status: BookingStatus;
  start_at: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  driver_name: string | null;
  vehicle_name: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  vehicle_model: string | null;
  driver_lat: number | null;
  driver_lng: number | null;
  driver_pos_at: string | null;
}

export default function Tracker({ reference, k }: { reference: string; k: string }) {
  const [t, setT] = useState<Track | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/suivi?ref=${encodeURIComponent(reference)}&k=${encodeURIComponent(k)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!stop) { setT(data); setError(""); }
      } catch (e) {
        if (!stop) setError(navigator.onLine ? (e as Error).message || "Suivi indisponible." : "Pas de connexion internet.");
      }
    };
    void load();
    const timer = setInterval(load, 15_000);
    return () => { stop = true; clearInterval(timer); };
  }, [reference, k]);

  if (error && !t) return <p className="alert-error">{error}</p>;
  if (!t) return <p className="text-neutral-500">Chargement…</p>;

  const start = Date.parse(t.start_at);
  const fresh = t.driver_pos_at && Date.now() - Date.parse(t.driver_pos_at) < 5 * 60_000;
  const driver = fresh && t.driver_lat !== null && t.driver_lng !== null ? { lat: t.driver_lat, lng: t.driver_lng } : null;
  const distKm = driver ? haversineKm(driver, { lat: t.pickup_lat, lng: t.pickup_lng }) * 1.3 : null;
  const eta = distKm !== null ? Math.max(1, Math.round((distKm / 20) * 60)) : null;
  const vehicle = [t.vehicle_name, t.vehicle_model, t.vehicle_color, t.vehicle_plate].filter(Boolean).join(" · ");

  let headline = STATUS_LABELS[t.status];
  if (t.status === "in_progress") headline = "Course en cours";
  else if (driver && eta !== null) headline = eta <= 2 ? "Votre chauffeur arrive" : `Votre chauffeur est à environ ${eta} min`;
  else if (t.status === "confirmed") headline = "Course confirmée";

  return (
    <div className="space-y-5">
      <div className="relative bg-ink-grad p-5 text-white">
        <div aria-hidden className="gold-rule absolute inset-x-0 top-0" />
        <p className="eyebrow !text-gold-light">{t.reference}</p>
        <p className="font-brand mt-2 text-xl">{headline}</p>
        <p className="mt-2 text-sm text-neutral-300">Prise en charge {formatDateLong(start)} à {dakarTime(start).replace(":", "h")}</p>
        {(t.driver_name || vehicle) && (
          <p className="mt-3 border-t border-white/10 pt-3 text-sm">
            {t.driver_name && <>Chauffeur : <strong>{t.driver_name}</strong><br /></>}
            {vehicle && <>Véhicule : <strong>{vehicle}</strong></>}
          </p>
        )}
      </div>
      <TrackMap pickup={{ lat: t.pickup_lat, lng: t.pickup_lng }} dropoff={{ lat: t.dropoff_lat, lng: t.dropoff_lng }} driver={driver} />
      <p className="text-sm text-neutral-600">
        {driver ? "Le carré doré indique la position de votre chauffeur (mise à jour automatique)." : "La position du chauffeur apparaîtra ici dès qu'il sera en route."}
      </p>
      <div className="text-[15px]">
        <p><span className="font-semibold text-neutral-500">A</span> {t.pickup_address}</p>
        <p><span className="font-semibold text-gold-dark">B</span> {t.dropoff_address}</p>
      </div>
      {error && <p className="alert-info">{error}</p>}
    </div>
  );
}
