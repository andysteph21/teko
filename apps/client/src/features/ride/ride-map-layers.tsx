// Surcouche carte du suivi (C-13/C-14) — vocabulaire 08-carte-langage :
// itinéraire violet liseré blanc, véhicule teal cerclé blanc, départ magenta,
// arrivée brand-900.
// TODO parité 08-carte-langage : épingles-gouttes (personne au départ,
// drapeau à l'arrivée), flèche de cap du véhicule et halo « en attente » —
// cercles simplifiés en attendant les pictos canvas.

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
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {},
      },
    ],
  };
}

/** Itinéraire retenu : liseré blanc 8,5 sous la ligne violette 5. */
export function RouteLine({ coordinates }: { coordinates: LonLat[] }) {
  if (coordinates.length < 2) return null;
  return (
    <GeoJSONSource id="rn-ride-route" data={routeToGeoJson(coordinates) as never}>
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

/** Départ : « quelqu'un attend ici » — cercle magenta cerclé blanc. */
export function OriginPin({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="rn-ride-origin" data={pointFc(position) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerClient,
          "circle-radius": 9,
          "circle-stroke-color": MAP_COLORS.halo,
          "circle-stroke-width": 2.5,
        }}
      />
    </GeoJSONSource>
  );
}

/** Arrivée : « on va là » — cercle brand-900 cerclé blanc. */
export function DestinationFlag({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="rn-ride-dest" data={pointFc(position) as never}>
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

/** Véhicule de la course : cercle teal cerclé blanc (source dédiée). */
export function VehicleMarker({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource
      id="rn-ride-vehicle"
      data={vehiclesToGeoJson([{ id: "ride-vehicle", ...position }]) as never}
    >
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
