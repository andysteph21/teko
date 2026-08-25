// Contrôleur carte web (MapLibre GL JS) — seul fichier du paquet qui importe
// maplibre-gl : les apps React Native consomment `@teko/maps` (cœur pur +
// adaptateur) avec leur propre rendu MapLibre Native.
//
// Usage :
//   const map = new TekoMapController(container, { eco: true });
//   map.setLandmarks(fc); map.setRoute(fc); map.setClientPosition({lon, lat});

import maplibregl from "maplibre-gl";
import { bboxAround, type LonLat } from "../geo";
import {
  clientPositionToGeoJson,
  type DepartureHotspot,
  departureHotspotsToGeoJson,
  emptyFeatureCollection,
  type FeatureCollection,
  type ProposedRoadRow,
  proposedRoadsToGeoJson,
  routeToGeoJson,
  type SavedPlaceRow,
  savedPlacesToGeoJson,
  type VehiclePosition,
  vehiclesToGeoJson,
} from "../geojson";
import { buildMapStyle, type MapStyleOptions, TEKO_SOURCES } from "../style";
import { animateAlong, type VehicleAnimation } from "./animations";
import { installPictos } from "./pictos";

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
      installPictos(this.map);
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
    this.setData(TEKO_SOURCES.client, p ? clientPositionToGeoJson(p) : emptyFeatureCollection);
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
