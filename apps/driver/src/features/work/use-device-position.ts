// Position GPS de l'appareil — hors emprise Gabon (dev, voyageur) : recadrage
// Libreville (lancement mono-ville). Partagée par la carte D-09, le heartbeat
// et l'envoi de positions en course. La permission Android est demandée au
// moment où elle devient nécessaire : le passage en ligne (use-online-toggle).

import type { LonLat } from "@teko/maps";
import * as Location from "expo-location";
import { useEffect } from "react";
import { DEFAULT_CENTER, withinGabon } from "../../config";
import { useWorkStore } from "./store";

/** `blocked` : refus définitif Android — seule issue, les réglages du téléphone. */
export type LocationPermission = "granted" | "denied" | "blocked";

/** Demande la permission si elle manque (popup système au premier passage). */
export async function ensureLocationPermission(): Promise<LocationPermission> {
  const current = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (current?.status === "granted") return "granted";
  if (current?.status === "denied" && !current.canAskAgain) return "blocked";
  const asked = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (asked?.status === "granted") return "granted";
  return asked?.canAskAgain === false ? "blocked" : "denied";
}

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

/** Position partagée (store) : lue une fois au montage pour centrer la carte,
 *  puis rafraîchie par chaque battement / envoi en course réussi. */
export function useDevicePosition(): LonLat | null {
  const position = useWorkStore((s) => s.devicePosition);
  const setDevicePosition = useWorkStore((s) => s.setDevicePosition);
  useEffect(() => {
    let cancelled = false;
    void fetchDevicePosition().then((p) => {
      if (p && !cancelled) setDevicePosition(p);
    });
    return () => {
      cancelled = true;
    };
  }, [setDevicePosition]);
  return position;
}
