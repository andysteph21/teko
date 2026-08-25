// Position GPS de l'appareil — hors emprise Gabon (dev, voyageur) : recadrage
// Libreville (lancement mono-ville). Partagée par la carte D-09, le heartbeat
// et l'envoi de positions en course.

import type { LonLat } from "@teko/maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { DEFAULT_CENTER, withinGabon } from "../../config";

/** Meilleure volonté : null si permission refusée ou GPS muet. */
export async function fetchDevicePosition(): Promise<LonLat | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  }).catch(() => null);
  if (!loc) return null;
  const raw = { lon: loc.coords.longitude, lat: loc.coords.latitude };
  return withinGabon(raw) ? raw : DEFAULT_CENTER;
}

/** Position une fois au montage (centrage carte D-09). */
export function useDevicePosition(): LonLat | null {
  const [position, setPosition] = useState<LonLat | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchDevicePosition().then((p) => {
      if (p && !cancelled) setPosition(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return position;
}
