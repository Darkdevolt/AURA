"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { addBaseLayer, pinIcon } from "@/lib/map-ui";
import type { LatLng } from "@/lib/types";

interface Props {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  route: [number, number][] | null;
  onPick: (kind: "pickup" | "dropoff") => void;
}

/** Aperçu du trajet : épingles A / B et itinéraire. Toucher une épingle ouvre le sélecteur. */
export default function RouteMap({ pickup, dropoff, route, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      zoomControl: false,
      dragging: !L.Browser.mobile, // sur téléphone, la page reste facile à faire défiler
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: true,
      attributionControl: true,
    }).setView([14.7167, -17.4677], 12);
    addBaseLayer(m, "clair");
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    if (route && route.length > 1 && pickup && dropoff) {
      L.polyline(route, { color: "#0a0a0a", weight: 7, opacity: 0.85, lineCap: "round", lineJoin: "round", interactive: false }).addTo(g);
      L.polyline(route, { color: "#e5b33a", weight: 3.5, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(g);
      pts.push(...route);
    }
    if (pickup) {
      L.marker([pickup.lat, pickup.lng], { icon: pinIcon("A"), title: "Départ — toucher pour modifier", zIndexOffset: 10 })
        .on("click", () => pickRef.current("pickup"))
        .addTo(g);
      pts.push([pickup.lat, pickup.lng]);
    }
    if (dropoff) {
      L.marker([dropoff.lat, dropoff.lng], { icon: pinIcon("B"), title: "Destination — toucher pour modifier", zIndexOffset: 20 })
        .on("click", () => pickRef.current("dropoff"))
        .addTo(g);
      pts.push([dropoff.lat, dropoff.lng]);
    }
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    else if (pts.length === 1) m.setView(pts[0], 16);
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, route]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="absolute inset-0" aria-label="Aperçu du trajet sur la carte" />;
}
