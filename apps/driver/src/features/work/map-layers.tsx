// Surcouche carte côté chauffeur — vocabulaire figé (08-carte-langage) :
// véhicule teal cerclé blanc, point de rencontre ambre (repère), destination
// brand-900, itinéraire violet liseré blanc.

import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import {
  type FeatureCollection,
  type LonLat,
  MAP_COLORS,
  routeToGeoJson,
  vehiclesToGeoJson,
} from "@teko/maps";
import { color } from "@teko/ui";

function pointFc(p: LonLat): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: {} },
    ],
  };
}

/** Ma voiture : cercle teal cerclé blanc. */
export function VehicleDot({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="drv-vehicle" data={vehiclesToGeoJson([{ id: "me", ...position }]) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerDriver,
          "circle-radius": 9,
          "circle-stroke-color": MAP_COLORS.halo,
          "circle-stroke-width": 2.5,
        }}
      />
    </GeoJSONSource>
  );
}

/** Point de rencontre : goutte repère ambre avec halo doux. */
export function MeetingPin({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="drv-meeting" data={pointFc(position) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerLandmark,
          "circle-opacity": 0.18,
          "circle-radius": 24,
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

/** Destination (visible seulement en course, D-13) : cercle brand-900. */
export function DestinationDot({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="drv-dest" data={pointFc(position) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": color.brand[900],
          "circle-radius": 9,
          "circle-stroke-color": MAP_COLORS.halo,
          "circle-stroke-width": 2.5,
        }}
      />
    </GeoJSONSource>
  );
}

/** Itinéraire retenu : liseré blanc 8,5 sous la ligne violette 5. */
export function RouteLine({ coordinates }: { coordinates: LonLat[] }) {
  if (coordinates.length < 2) return null;
  return (
    <GeoJSONSource id="drv-route" data={routeToGeoJson(coordinates) as never}>
      <Layer
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.halo, "line-width": 8.5 }}
      />
      <Layer
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": MAP_COLORS.routeLine, "line-width": 5 }}
      />
    </GeoJSONSource>
  );
}
