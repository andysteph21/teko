// Carte native MapLibre (RN) — consomme le style @teko/maps (mêmes régimes
// éco/complet que le web). Base du rendu carte de l'app ; les surcouches
// dynamiques se posent en enfants (GeoJSONSource + Layer).

import { Camera, type CameraRef, Map as MapLibreMap } from "@maplibre/maplibre-react-native";
import { buildMapStyle, type LonLat, type MapStyleOptions } from "@teko/maps";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface TekoMapViewProps {
  options?: MapStyleOptions;
  center: LonLat;
  zoom?: number;
  recenter?: LonLat | null;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function TekoMapView({
  options,
  center,
  zoom = 14,
  recenter,
  style,
  children,
}: TekoMapViewProps) {
  const mapStyle = useMemo(
    () => buildMapStyle({ ...options, communityTiles: true }) as never,
    [options],
  );
  const camera = useRef<CameraRef>(null);
  const move = useCallback(() => {
    if (recenter) camera.current?.jumpTo({ center: [recenter.lon, recenter.lat] });
  }, [recenter]);
  useEffect(move, [move]);
  return (
    <MapLibreMap mapStyle={mapStyle} style={style ?? styles.fill} onDidFinishLoadingMap={move}>
      <Camera ref={camera} initialViewState={{ center: [center.lon, center.lat], zoom }} />
      {children}
    </MapLibreMap>
  );
}

const styles = { fill: { flex: 1 } } as const;
