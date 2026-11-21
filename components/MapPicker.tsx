"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DAKAR_CENTER } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export type PointKind = "pickup" | "dropoff";

interface Props {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  active: PointKind;
  onPick: (kind: PointKind, p: LatLng) => void;
}

const icon = (kind: PointKind) =>
  L.divIcon({
    className: "",
    html: `<div class="la-marker ${kind === "pickup" ? "la-marker-a" : "la-marker-b"}"><span>${kind === "pickup" ? "A" : "B"}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

export default function MapPicker({ pickup, dropoff, active, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Partial<Record<PointKind, L.Marker>>>({});
  const activeRef = useRef(active);
  const pickRef = useRef(onPick);
  activeRef.current = active;
  pickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(
      [DAKAR_CENTER.lat, DAKAR_CENTER.lng],
      12,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => pickRef.current(activeRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      markers.current = {};
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const [kind, pos] of [
      ["pickup", pickup],
      ["dropoff", dropoff],
    ] as const) {
      const existing = markers.current[kind];
      if (!pos) {
        existing?.remove();
        delete markers.current[kind];
        continue;
      }
      if (existing) {
        existing.setLatLng([pos.lat, pos.lng]);
      } else {
        const mk = L.marker([pos.lat, pos.lng], {
          icon: icon(kind),
          draggable: true,
          keyboard: true,
          title: kind === "pickup" ? "Départ (déplaçable)" : "Destination (déplaçable)",
        }).addTo(m);
        mk.on("dragend", () => {
          const ll = mk.getLatLng();
          pickRef.current(kind, { lat: ll.lat, lng: ll.lng });
        });
        markers.current[kind] = mk;
      }
    }
    if (pickup && dropoff) {
      m.fitBounds(L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]), { padding: [40, 40], maxZoom: 15 });
    } else if (pickup || dropoff) {
      const p = (pickup ?? dropoff)!;
      m.setView([p.lat, p.lng], Math.max(m.getZoom(), 15));
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={el}
      className="h-72 w-full overflow-hidden rounded-xl border border-line bg-neutral-100 sm:h-80"
      role="application"
      aria-label="Carte : touchez pour placer le repère, ou faites-le glisser"
    />
  );
}
