// Surcouches carte du parcours commande — vocabulaire figé (08-carte-langage) :
// itinéraire violet routeLine sur chemisage blanc, repère ambre avec halo,
// trajet à pied en pointillés magenta. GeoJSON pur, aucun état.

import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { type FeatureCollection, type LonLat, MAP_COLORS, routeToGeoJson } from "@teko/maps";

const pointFc = (p: LonLat): FeatureCollection => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { kind: "landmark" },
    },
  ],
});

/** Itinéraire retenu (C-10) — ligne violette, chemisage blanc. */
export function RouteOverlay({ coordinates }: { coordinates: LonLat[] }) {
  if (coordinates.length < 2) return null;
  return (
    <GeoJSONSource id="rn-route" data={routeToGeoJson(coordinates) as never}>
      <Layer
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.halo, "line-width": 9 }}
      />
      <Layer
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.routeLine, "line-width": 5 }}
      />
    </GeoJSONSource>
  );
}

/** Repère ambre (destination C-10, point de rencontre C-11/C-12). */
export function LandmarkMarker({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="rn-booking-landmark" data={pointFc(position) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerLandmark,
          "circle-opacity": 0.18,
          "circle-radius": 26,
        }}
      />
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerLandmark,
          "circle-radius": 9,
          "circle-stroke-color": MAP_COLORS.halo,
          "circle-stroke-width": 2.5,
        }}
      />
    </GeoJSONSource>
  );
}

/** Marche client → point de rencontre (C-11) — pointillés magenta. */
export function WalkLine({ from, to }: { from: LonLat; to: LonLat | null }) {
  if (!to) return null;
  return (
    <GeoJSONSource id="rn-walk" data={routeToGeoJson([from, to]) as never}>
      <Layer
        type="line"
        layout={{ "line-cap": "round" }}
        paint={{
          "line-color": MAP_COLORS.markerClient,
          "line-width": 3,
          "line-dasharray": [0.2, 2.4],
        }}
      />
    </GeoJSONSource>
  );
}
