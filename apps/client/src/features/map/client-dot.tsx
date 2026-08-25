// Point client sur carte native — vocabulaire figé (08-carte-langage) :
// magenta cerclé de blanc + anneau de pulsation doux en dessous.

import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import { clientPositionToGeoJson, type LonLat, MAP_COLORS } from "@teko/maps";

export function ClientDot({ position }: { position: LonLat | null }) {
  if (!position) return null;
  return (
    <GeoJSONSource id="rn-client" data={clientPositionToGeoJson(position) as never}>
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerClient,
          "circle-opacity": 0.15,
          "circle-radius": 26,
        }}
      />
      <Layer
        type="circle"
        paint={{
          "circle-color": MAP_COLORS.markerClient,
          "circle-radius": 8,
          "circle-stroke-color": MAP_COLORS.halo,
          "circle-stroke-width": 3,
        }}
      />
    </GeoJSONSource>
  );
}
