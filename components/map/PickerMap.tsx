"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { addBaseLayer, pinIcon, userDotIcon, type BaseLayer } from "@/lib/map-ui";
import type { LatLng } from "@/lib/types";

export interface FlyTo extends LatLng {
  zoom: number;
  key: number;
}

interface Props {
  initial: LatLng;
  initialZoom: number;
  layer: BaseLayer;
  flyTo: FlyTo | null;
  user: (LatLng & { accuracy: number }) | null;
  other: (LatLng & { kind: "A" | "B" }) | null;
  onMove: (center: LatLng, moving: boolean) => void;
}

/** Carte du sélecteur : l'utilisateur déplace la carte sous un repère fixe au centre. */
export default function PickerMap({ initial, initialZoom, layer, flyTo, user, other, onMove }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.Layer[]>([]);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const otherMarker = useRef<L.Marker | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([initial.lat, initial.lng], initialZoom);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    m.on("movestart", () => {
      const c = m.getCenter();
      moveRef.current({ lat: c.lat, lng: c.lng }, true);
    });
    m.on("moveend", () => {
      const c = m.getCenter();
      moveRef.current({ lat: c.lat, lng: c.lng }, false);
    });
    userLayer.current = L.layerGroup().addTo(m);
    base.current = addBaseLayer(m, layer);
    map.current = m;
    // La carte s'ouvre dans un panneau : recalcule sa taille une fois affichée
    setTimeout(() => m.invalidateSize(), 60);
    moveRef.current({ lat: initial.lat, lng: initial.lng }, false);
    return () => {
      m.remove();
      map.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const l of base.current) m.removeLayer(l);
    base.current = addBaseLayer(m, layer);
  }, [layer]);

  useEffect(() => {
    if (flyTo && map.current) map.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 0.6 });
  }, [flyTo?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = userLayer.current;
    if (!g) return;
    g.clearLayers();
    if (!user) return;
    L.circle([user.lat, user.lng], {
      radius: Math.min(user.accuracy, 300),
      color: "#1a73e8",
      weight: 1,
      fillColor: "#1a73e8",
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(g);
    L.marker([user.lat, user.lng], { icon: userDotIcon, interactive: false, keyboard: false }).addTo(g);
  }, [user?.lat, user?.lng, user?.accuracy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    otherMarker.current?.remove();
    otherMarker.current = other
      ? L.marker([other.lat, other.lng], { icon: pinIcon(other.kind), interactive: false, keyboard: false, opacity: 0.85 }).addTo(m)
      : null;
  }, [other?.lat, other?.lng, other?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="absolute inset-0" role="application" aria-label="Carte : déplacez la carte pour placer le repère au centre" />;
}
