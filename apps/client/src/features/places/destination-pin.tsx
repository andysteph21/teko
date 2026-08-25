// Épingle ambre de destination/proposition (C-09, C-26) — vocabulaire carte
// figé (08-carte-langage) : repères en ambre. Halo doux + point cerclé blanc,
// même construction que ClientDot (magenta) côté client.

import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { clientPositionToGeoJson, type LonLat, MAP_COLORS } from "@teko/maps";

export function DestinationPin({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="rn-destination" data={clientPositionToGeoJson(position) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerLandmark,
          "circle-opacity": 0.14,
          "circle-radius": 30,
        }}
      />
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerLandmark,
          "circle-radius": 9,
          "circle-stroke-color": MAP_COLORS.halo,
          "circle-stroke-width": 3,
        }}
      />
    </GeoJSONSource>
  );
}
