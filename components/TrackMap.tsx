"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { addBaseLayer, carIcon as car, pinIcon } from "@/lib/map-ui";
import type { LatLng } from "@/lib/types";

export default function TrackMap({ pickup, dropoff, driver }: { pickup: LatLng; dropoff: LatLng; driver: LatLng | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const carMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false }).setView([pickup.lat, pickup.lng], 14);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    addBaseLayer(m, "clair");
    L.marker([pickup.lat, pickup.lng], { icon: pinIcon("A") }).addTo(m);
    L.marker([dropoff.lat, dropoff.lng], { icon: pinIcon("B") }).addTo(m);
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

  return <div ref={el} className="relative isolate h-80 w-full border border-line bg-neutral-100" role="application" aria-label="Carte de suivi du chauffeur" />;
}
