"use client";

// Fond de carte MapLibre du tableau de bord — importé uniquement via
// next/dynamic (ssr:false) : maplibre-gl exige window.
//
// TODO(backend) : positions temps réel admin — l'api-client n'expose aucune
// lecture driver_presence/positions côté console ; il faudra un canal
// Realtime dédié (ADR-13) avant d'appeler map.setVehicles(...).

import "maplibre-gl/dist/maplibre-gl.css";
import { TekoMapController } from "@teko/maps/web";
import { useEffect, useRef } from "react";
import { DEFAULT_CENTER, TILES_URL } from "../../config";

export default function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new TekoMapController(containerRef.current, {
      tilesUrl: TILES_URL,
      center: DEFAULT_CENTER,
      zoom: 12,
      labelDensity: "dense",
    });
    return () => map.destroy();
  }, []);

  return <div ref={containerRef} data-testid="dashboard-map" className="h-full w-full" />;
}
