// Contrôleur carte web (MapLibre GL JS) — seul fichier du paquet qui importe
// maplibre-gl : les apps React Native consomment `@teko/maps` (cœur pur +
// adaptateur) avec leur propre rendu MapLibre Native.
//
// Usage :
//   const map = new TekoMapController(container, { eco: true });
//   map.setLandmarks(fc); map.setRoute(fc); map.setClientPosition({lon, lat});

import maplibregl from "maplibre-gl";
import { type LonLat, bboxAround } from "../geo.js";
import { type VehicleAnimation, animateAlong, makeLetterImage, makePin, makePulse } from "./animations.js";
import { LANDMARK_LETTERS } from "../geojson.js";
import {
  type DepartureHotspot,
  type FeatureCollection,
  type ProposedRoadRow,
  type SavedPlaceRow,
  type VehiclePosition,
  clientPositionToGeoJson,
  departureHotspotsToGeoJson,
  emptyFeatureCollection,
  proposedRoadsToGeoJson,
  routeToGeoJson,
  savedPlacesToGeoJson,
  vehiclesToGeoJson,
} from "../geojson.js";
import { type MapStyleOptions, TEKO_SOURCES, buildMapStyle } from "../style.js";

const LIBREVILLE: [number, number] = [9.4536, 0.4032];

export interface TekoMapOptions extends MapStyleOptions {
  center?: LonLat;
  zoom?: number;
  interactive?: boolean;
}

export class TekoMapController {
  readonly map: maplibregl.Map;
  private ready = false;
  private pending: Array<() => void> = [];

  constructor(container: HTMLElement, opts: TekoMapOptions = {}) {
    this.map = new maplibregl.Map({
      container,
      style: buildMapStyle(opts) as never,
      center: opts.center ? [opts.center.lon, opts.center.lat] : LIBREVILLE,
      zoom: opts.zoom ?? 14,
      interactive: opts.interactive ?? true,
      // Compact : repliée en icône ⓘ, dépliable — satisfait l'obligation
      // d'attribution OSM sans manger l'écran mobile (OSM-02).
      attributionControl: { compact: true },
    });
    this.map.on("load", () => {
      this.installPictos();
      this.ready = true;
      for (const fn of this.pending) fn();
      this.pending = [];
    });
  }

  /** Exécute après le chargement du style (les setX peuvent être appelés tôt). */
  private whenReady(fn: () => void): void {
    if (this.ready) fn();
    else this.pending.push(fn);
  }

  private setData(sourceId: string, data: FeatureCollection): void {
    this.whenReady(() => {
      const src = this.map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data as never);
    });
  }

  setLandmarks(data: FeatureCollection): void {
    this.setData(TEKO_SOURCES.landmarks, data);
  }

  setRoute(coordinates: LonLat[] | FeatureCollection): void {
    const data = Array.isArray(coordinates) ? routeToGeoJson(coordinates) : coordinates;
    this.setData(TEKO_SOURCES.route, data);
  }

  setVehicles(vehicles: VehiclePosition[]): void {
    this.setData(TEKO_SOURCES.vehicles, vehiclesToGeoJson(vehicles));
  }

  /** Lieux favoris / points de départ habituels (D, T, ★). */
  setSavedPlaces(rows: SavedPlaceRow[] | FeatureCollection): void {
    const data = Array.isArray(rows) ? savedPlacesToGeoJson(rows) : rows;
    this.setData(TEKO_SOURCES.savedPlaces, data);
  }

  /** Routes détectées « à confirmer » (pointillé + mention le long du tracé). */
  setProposedRoads(rows: ProposedRoadRow[] | FeatureCollection): void {
    const data = Array.isArray(rows) ? proposedRoadsToGeoJson(rows) : rows;
    this.setData(TEKO_SOURCES.proposedRoads, data);
  }

  /** Zones de départ fréquentes (halos d'aide au positionnement chauffeur). */
  setDepartureHotspots(spots: DepartureHotspot[] | FeatureCollection): void {
    const data = Array.isArray(spots) ? departureHotspotsToGeoJson(spots) : spots;
    this.setData(TEKO_SOURCES.departureHotspots, data);
  }

  setClientPosition(p: LonLat | null): void {
    this.setData(
      TEKO_SOURCES.client,
      p ? clientPositionToGeoJson(p) : emptyFeatureCollection,
    );
  }

  // Pictogrammes & animations — lisibles sans texte : épingle-personne au
  // départ, épingle-drapeau à l'arrivée, position qui pulse, attente qui
  // respire, voiture qui roule et s'oriente.
  private installPictos(): void {
    const m = this.map;
    m.addImage("teko-pin-depart", makePin("person", "#8C238A"), { pixelRatio: 2 });
    m.addImage("teko-pin-dest", makePin("flag", "#3D0F5C"), { pixelRatio: 2 });
    m.addImage("teko-pulse-client", makePulse(m, "#8C238A") as never, { pixelRatio: 2 });
    m.addImage("teko-pulse-vehicle", makePulse(m, "#00BFA5") as never, { pixelRatio: 2 });

    m.addSource("teko-endpoints", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    // Pulsation sous le point client (anneau magenta qui s'étend).
    m.addLayer(
      {
        id: "teko-client-pulse",
        type: "symbol",
        source: TEKO_SOURCES.client,
        layout: { "icon-image": "teko-pulse-client", "icon-allow-overlap": true, "icon-ignore-placement": true },
      },
      "teko-client-dot",
    );
    // Halo d'attente du véhicule (anneau teal), activé via setVehicleWaiting.
    m.addLayer(
      {
        id: "teko-vehicle-pulse",
        type: "symbol",
        source: TEKO_SOURCES.vehicles,
        layout: {
          "icon-image": "teko-pulse-vehicle",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          visibility: "none",
        },
      },
      "teko-vehicles-dot",
    );
    // Passager à bord : point magenta au cœur du véhicule (setClientAboard).
    m.addLayer({
      id: "teko-vehicle-aboard",
      type: "circle",
      source: TEKO_SOURCES.vehicles,
      layout: { visibility: "none" },
      paint: {
        "circle-color": "#8C238A",
        "circle-radius": 4,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-width": 1.5,
      },
    });
    // ÉCO (pas de glyphes distants) : les initiales de catégories et les
    // lettres D/T/★ sont rendues en images canvas (police système, zéro
    // octet réseau) — le mode éco reste lisible sans texte téléchargé.
    if (!this.map.getLayer("teko-landmarks-letter")) {
      const lettres = new Set([...Object.values(LANDMARK_LETTERS), "D", "T", "★"]);
      for (const l of lettres) {
        m.addImage(`teko-lettre-amber-${l}`, makeLetterImage(l, "#4A2F03"), { pixelRatio: 2 });
        m.addImage(`teko-lettre-brand-${l}`, makeLetterImage(l, "#5A1A80"), { pixelRatio: 2 });
      }
      m.addLayer({
        id: "teko-landmarks-letter-eco",
        type: "symbol",
        source: TEKO_SOURCES.landmarks,
        layout: {
          "icon-image": ["concat", "teko-lettre-amber-", ["get", "lettre"]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      m.addLayer({
        id: "teko-saved-places-dot-eco",
        type: "circle",
        source: TEKO_SOURCES.savedPlaces,
        paint: {
          "circle-color": "#FFFFFF",
          "circle-radius": 9,
          "circle-stroke-color": "#8C238A",
          "circle-stroke-width": 2.5,
        },
      });
      m.addLayer({
        id: "teko-saved-places-letter-eco",
        type: "symbol",
        source: TEKO_SOURCES.savedPlaces,
        layout: {
          "icon-image": ["concat", "teko-lettre-brand-", ["get", "lettre"]],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    }

    // Épingles départ/arrivée, ancrées à la pointe.
    m.addLayer({
      id: "teko-endpoints-pins",
      type: "symbol",
      source: "teko-endpoints",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 15, 1],
      },
    });
  }

  /** Épingles pictogrammes : départ (personne) et/ou arrivée (drapeau). */
  setEndpoints(depart: LonLat | null, destination: LonLat | null): void {
    this.whenReady(() => {
      const features = [];
      if (depart) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [depart.lon, depart.lat] },
          properties: { icon: "teko-pin-depart" },
        });
      }
      if (destination) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [destination.lon, destination.lat] },
          properties: { icon: "teko-pin-dest" },
        });
      }
      (this.map.getSource("teko-endpoints") as maplibregl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features,
      } as never);
    });
  }

  /** Halo « le chauffeur vous attend » autour du véhicule. */
  setVehicleWaiting(on: boolean): void {
    this.whenReady(() =>
      this.map.setLayoutProperty("teko-vehicle-pulse", "visibility", on ? "visible" : "none"),
    );
  }

  /** Passager à bord : cœur magenta dans le véhicule. */
  setClientAboard(on: boolean): void {
    this.whenReady(() =>
      this.map.setLayoutProperty("teko-vehicle-aboard", "visibility", on ? "visible" : "none"),
    );
  }

  /**
   * Fait rouler un véhicule le long de l'itinéraire (cap suivi) et consomme
   * le tracé derrière lui (gris) si `consumeRoute`.
   */
  driveVehicleAlong(
    id: string,
    route: LonLat[],
    durationMs: number,
    opts: { consumeRoute?: boolean; follow?: { zoom: number } } = {},
  ): VehicleAnimation {
    return animateAlong(route, durationMs, (position, bearing, t) => {
      this.setVehicles([{ id, ...position, bearing }]);
      if (opts.consumeRoute) this.setRouteProgress(t);
      // Caméra qui suit le véhicule (les noms de rues restent lisibles au
      // zoom donné — mise à jour continue, pas d'à-coups d'easing).
      if (opts.follow) {
        this.map.jumpTo({ center: [position.lon, position.lat], zoom: opts.follow.zoom });
      }
    });
  }

  /** Progression du tracé : la partie parcourue devient gris-violet. */
  setRouteProgress(t: number | null): void {
    this.whenReady(() => {
      if (t === null) {
        this.map.setPaintProperty("teko-route-line", "line-gradient", undefined as never);
        return;
      }
      const p = Math.min(0.999, Math.max(0.001, t));
      this.map.setPaintProperty("teko-route-line", "line-gradient", [
        "step",
        ["line-progress"],
        "#C6C0D8",
        p,
        "#5A1A80",
      ] as never);
    });
  }

  /** Cadre la vue sur les points donnés (départ + arrivée + véhicule…). */
  fitTo(points: LonLat[], paddingM = 200): void {
    if (points.length === 0) return;
    const [w, s, e, n] = bboxAround(points, paddingM);
    this.whenReady(() =>
      this.map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: 40, animate: false },
      ),
    );
  }

  onClick(handler: (p: LonLat) => void): void {
    this.map.on("click", (e) => handler({ lon: e.lngLat.lng, lat: e.lngLat.lat }));
  }

  /** Rendu terminé (utile aux tests visuels). */
  onIdle(handler: () => void): void {
    this.map.once("idle", handler);
  }

  destroy(): void {
    this.map.remove();
  }
}
