"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/types";

const pin = (cls: string, label: string) =>
  L.divIcon({ className: "", html: `<div class="la-marker ${cls}"><span>${label}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34] });
const car = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;background:#c48a16;border:3px solid #0a0a0a;box-shadow:0 0 0 6px rgba(196,138,22,.25)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function TrackMap({ pickup, dropoff, driver }: { pickup: LatLng; dropoff: LatLng; driver: LatLng | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const carMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView([pickup.lat, pickup.lng], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    L.marker([pickup.lat, pickup.lng], { icon: pin("la-marker-a", "A") }).addTo(m);
    L.marker([dropoff.lat, dropoff.lng], { icon: pin("la-marker-b", "B") }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      carMarker.current = null;
    };
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!driver) {
      carMarker.current?.remove();
      carMarker.current = null;
      return;
    }
    if (carMarker.current) carMarker.current.setLatLng([driver.lat, driver.lng]);
    else carMarker.current = L.marker([driver.lat, driver.lng], { icon: car, title: "Votre chauffeur" }).addTo(m);
    m.fitBounds(L.latLngBounds([driver.lat, driver.lng], [pickup.lat, pickup.lng]), { padding: [50, 50], maxZoom: 16 });
  }, [driver?.lat, driver?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="h-80 w-full border border-line bg-neutral-100" role="application" aria-label="Carte de suivi du chauffeur" />;
}
