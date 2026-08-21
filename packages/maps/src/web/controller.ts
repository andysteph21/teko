// Contrôleur carte web (MapLibre GL JS) — seul fichier du paquet qui importe
// maplibre-gl : les apps React Native consomment `@teko/maps` (cœur pur +
// adaptateur) avec leur propre rendu MapLibre Native.
//
// Usage :
//   const map = new TekoMapController(container, { eco: true });
//   map.setLandmarks(fc); map.setRoute(fc); map.setClientPosition({lon, lat});

import maplibregl from "maplibre-gl";
import { type LonLat, bboxAround } from "../geo.js";
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
