import type { LonLat } from "@teko/maps";
import { useLocationRefresh, withLocationDeadline } from "@teko/ui/native";
import * as Location from "expo-location";
import { useEffect } from "react";
import { devicePoint } from "../../config";
import { useWorkStore } from "./store";

/** `blocked` : refus définitif Android — seule issue, les réglages du téléphone. */
export type LocationPermission = "granted" | "denied" | "blocked";

let permissionRequest: Promise<LocationPermission> | undefined;

/** L’accueil et le passage en ligne partagent la même demande système. */
export function ensureLocationPermission(): Promise<LocationPermission> {
  permissionRequest ??= requestPermission().finally(() => {
    permissionRequest = undefined;
  });
  return permissionRequest;
}

async function requestPermission(): Promise<LocationPermission> {
  const current = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (current?.status === "granted") return "granted";
  if (current?.status === "denied" && !current.canAskAgain) return "blocked";
  const asked = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (asked?.status === "granted") return "granted";
  return asked?.canAskAgain === false ? "blocked" : "denied";
}

/** Meilleure volonté : null si permission refusée ou GPS muet. */
export async function fetchDevicePosition(
  accuracy = Location.Accuracy.Balanced,
): Promise<LonLat | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const loc = await Location.getCurrentPositionAsync({
    accuracy,
  }).catch(() => null);
  if (!loc) return null;
  const raw = { lon: loc.coords.longitude, lat: loc.coords.latitude };
  return devicePoint(raw);
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

function locationUnavailable() {
  useWorkStore.getState().setLocationIssue("lost");
}

async function homePoint(manual: boolean) {
  const current = await Location.getForegroundPermissionsAsync();
  const permission =
    manual || current.status === "undetermined" ? await ensureLocationPermission() : current.status;
  if (permission !== "granted") {
    if (manual)
      useWorkStore.getState().setLocationIssue(permission === "blocked" ? "blocked" : "denied");
    return null;
  }
  const point = await withLocationDeadline(
    fetchDevicePosition(manual ? Location.Accuracy.High : undefined),
  );
  if (manual && !point) locationUnavailable();
  return point;
}

function applyHomePoint(point: LonLat, manual: boolean) {
  const store = useWorkStore.getState();
  store.setDevicePosition(point);
  if (manual) store.setLocationIssue(null);
}

/** Le recentrage suit les gestes GPS, indépendamment des battements de présence. */
export function useDriverHomePosition() {
  const position = useWorkStore((s) => s.devicePosition);
  const gps = useLocationRefresh(homePoint, applyHomePoint, locationUnavailable);
  return { ...gps, position, recenter: gps.position };
}
