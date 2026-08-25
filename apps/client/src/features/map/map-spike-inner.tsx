// SPIKE lot 1 — MapLibre RN sur Android d'entrée de gamme (07-evaluation §6) :
// fond vectoriel Martin (Gabon) + 20 véhicules animés à ~30 im/s pilotés par
// le fil JS (pire cas honnête). Mesure : compteur FPS JS à l'écran +
// `dumpsys gfxinfo` côté hôte. Route DEV uniquement — pas un écran produit.

import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import {
  type LonLat,
  MAP_COLORS,
  pointAlong,
  type VehiclePosition,
  vehiclesToGeoJson,
} from "@teko/maps";
import { color, spacing, typography } from "@teko/ui";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TekoMapView } from "./native-map";

const CENTER: LonLat = { lon: 9.4536, lat: 0.4032 };
const TILES_URL = process.env.EXPO_PUBLIC_TILES_URL ?? "http://127.0.0.1:3333/gabon";
const VEHICLES = 20;
const TICK_MS = 33;

/** Boucle fermée pseudo-aléatoire (déterministe par index) autour du centre. */
function makeLoop(index: number): LonLat[] {
  const radius = 0.004 + (index % 5) * 0.0025;
  const offsetLon = ((index * 37) % 11) * 0.001 - 0.005;
  const offsetLat = ((index * 53) % 11) * 0.001 - 0.005;
  const points: LonLat[] = [];
  for (let i = 0; i <= 48; i++) {
    const angle = (i / 48) * 2 * Math.PI;
    points.push({
      lon: CENTER.lon + offsetLon + radius * Math.cos(angle),
      lat: CENTER.lat + offsetLat + radius * Math.sin(angle) * 0.8,
    });
  }
  return points;
}

const LOOPS = Array.from({ length: VEHICLES }, (_, i) => makeLoop(i));

function vehiclesAt(elapsedMs: number): VehiclePosition[] {
  return LOOPS.map((loop, i) => {
    const speed = 25_000 + (i % 7) * 6_000;
    const t = ((elapsedMs + i * 1_500) % speed) / speed;
    const { position, bearing } = pointAlong(loop, t);
    return { id: `spike-${i}`, ...position, bearing };
  });
}

export default function MapSpike() {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>(() => vehiclesAt(0));
  const [fps, setFps] = useState(0);
  const frames = useRef(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      frames.current += 1;
      setVehicles(vehiclesAt(Date.now() - start));
    }, TICK_MS);
    const fpsTimer = setInterval(() => {
      setFps(frames.current);
      frames.current = 0;
    }, 1_000);
    return () => {
      clearInterval(tick);
      clearInterval(fpsTimer);
    };
  }, []);

  return (
    <View style={styles.screen}>
      <TekoMapView options={{ tilesUrl: TILES_URL }} center={CENTER} zoom={13.2}>
        <GeoJSONSource id="spike-vehicles" data={vehiclesToGeoJson(vehicles) as never}>
          <Layer
            type="circle"
            paint={{
              "circle-color": MAP_COLORS.markerDriver,
              "circle-radius": 9,
              "circle-stroke-color": MAP_COLORS.halo,
              "circle-stroke-width": 2.5,
            }}
          />
          <Layer
            type="symbol"
            layout={{
              "text-field": "▲",
              "text-font": ["DejaVu Sans Bold"],
              "text-size": 11,
              "text-rotate": ["get", "bearing"],
              "text-rotation-alignment": "map",
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            }}
            paint={{ "text-color": "#04342C" }}
          />
        </GeoJSONSource>
      </TekoMapView>
      <View style={styles.hud}>
        <Text style={styles.hudText}>
          Spike MapLibre RN · {VEHICLES} véhicules · JS {fps} im/s
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hud: {
    position: "absolute",
    top: spacing[12],
    left: spacing[4],
    backgroundColor: color.neutral[900],
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    opacity: 0.85,
  },
  hudText: {
    color: color.neutral[0],
    fontSize: typography.fontSize.sm,
    fontVariant: ["tabular-nums"],
  },
});
