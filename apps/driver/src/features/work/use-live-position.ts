// Position vivante de l'écran de course : le point véhicule suit le GPS tant
// que l'écran est ouvert. Le service d'arrière-plan envoie les positions au
// serveur mais ne rafraîchissait pas l'affichage (retour terrain du
// 11 novembre 2026 : point du chauffeur figé pendant la course).

import * as Location from "expo-location";
import { useEffect } from "react";
import { devicePoint } from "../../config";
import { useWorkStore } from "./store";

export const LIVE_POSITION_MS = 2_000;
const LIVE_DISTANCE_M = 5;

export function useLivePosition(active: boolean): void {
  const setDevicePosition = useWorkStore((s) => s.setDevicePosition);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LIVE_POSITION_MS,
          distanceInterval: LIVE_DISTANCE_M,
        },
        (location) => {
          setDevicePosition(
            devicePoint({ lon: location.coords.longitude, lat: location.coords.latitude }),
          );
        },
      );
      if (cancelled) watcher.remove();
      else subscription = watcher;
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active, setDevicePosition]);
}
