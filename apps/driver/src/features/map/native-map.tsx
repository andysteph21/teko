// Carte native MapLibre (RN) — consomme le style @teko/maps (mêmes régimes
// éco/complet que le web). Base du rendu carte de l'app ; les surcouches
// dynamiques se posent en enfants (GeoJSONSource + Layer).

import { Camera, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { buildMapStyle, type LonLat, type MapStyleOptions } from "@teko/maps";
import { type ReactNode, useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface TekoMapViewProps {
  options?: MapStyleOptions;
  center: LonLat;
  zoom?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function TekoMapView({ options, center, zoom = 14, style, children }: TekoMapViewProps) {
  const mapStyle = useMemo(() => buildMapStyle(options) as never, [options]);
  return (
    <MapLibreMap mapStyle={mapStyle} style={style ?? styles.fill}>
      <Camera initialViewState={{ center: [center.lon, center.lat], zoom }} />
      {children}
    </MapLibreMap>
  );
}

const styles = { fill: { flex: 1 } } as const;
