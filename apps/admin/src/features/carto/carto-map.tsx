"use client";

// Volet carte de la modération (A-04) — instancie TekoMapController (MapLibre
// GL JS). Chargé via next/dynamic ssr:false depuis carto-page : jamais côté
// serveur. Export par défaut pour l'import dynamique.

import "maplibre-gl/dist/maplibre-gl.css";
import {
  type FeatureCollection,
  type LonLat,
  landmarkLetter,
  type ProposedRoadRow,
} from "@teko/maps";
import { TekoMapController } from "@teko/maps/web";
import { useEffect, useRef } from "react";
import { DEFAULT_CENTER, TILES_URL } from "../../config";
import type { ModerationItem } from "./proposals";

export interface CartoMapProps {
  items: ModerationItem[];
  /** Points à cadrer (sélection dans la file) — null : cadrage inchangé. */
  focus: LonLat[] | null;
}

/** Épingles ambre des repères proposés — properties {name, category, lettre}. */
function landmarksCollection(items: ModerationItem[]): FeatureCollection {
  const features: FeatureCollection["features"] = [];
  for (const item of items) {
    const point = item.kind === "landmark" ? item.points[0] : undefined;
    if (!point) continue;
    features.push({
      type: "Feature",
      id: item.id,
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
      properties: {
        kind: "landmark",
        name: item.title,
        category: item.category,
        lettre: landmarkLetter(item.category ?? "other"),
      },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Tracés pointillés « à confirmer » des routes détectées. */
function proposedRoadRows(items: ModerationItem[]): ProposedRoadRow[] {
  return items
    .filter((item) => item.kind === "road" && item.points.length >= 2)
    .map((item) => ({ id: item.id, coordinates: item.points, supportCount: item.supportCount }));
}

export default function CartoMap({ items, focus }: CartoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TekoMapController | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new TekoMapController(container, {
      tilesUrl: TILES_URL,
      labelDensity: "dense",
      center: DEFAULT_CENTER,
      zoom: 12,
    });
    mapRef.current = map;
    return () => {
      mapRef.current = null;
      map.destroy();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setLandmarks(landmarksCollection(items));
    map.setProposedRoads(proposedRoadRows(items));
  }, [items]);

  useEffect(() => {
    if (focus && focus.length > 0) mapRef.current?.fitTo(focus, 150);
  }, [focus]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Carte des propositions en attente"
      className="h-full w-full"
      data-testid="carto-map"
    />
  );
}
