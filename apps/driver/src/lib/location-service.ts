import * as Location from "expo-location";
import { AppState } from "react-native";
import {
  clearLocationState,
  type DriverLocationState,
  readLocationState,
  writeLocationState,
} from "./location-state";

export const DRIVER_LOCATION_TASK = "teko-alpha-driver-location";

async function stop(expectedUserId?: string): Promise<void> {
  if (expectedUserId && (await readLocationState())?.userId !== expectedUserId) return;
  await clearLocationState();
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  }
}

async function configure(input: {
  userId: string;
  online?: boolean;
  rideId?: string | null;
  eco: boolean;
}): Promise<void> {
  const existing = await readLocationState();
  const current: DriverLocationState =
    existing?.userId === input.userId
      ? existing
      : {
          userId: input.userId,
          online: false,
          rideId: null,
          eco: input.eco,
          lastHeartbeatAt: 0,
          lastRideCheckAt: 0,
        };
  const state = { ...current, ...input };
  if (!state.online && !state.rideId) {
    await stop(input.userId);
    return;
  }
  await writeLocationState(state);
  // Android impose un départ du service depuis une action/app visible.
  if (AppState.currentState !== "active") return;
  await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 0,
    timeInterval: state.rideId ? (state.eco ? 10000 : 5000) : 20000,
    deferredUpdatesInterval: 0,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "Teko Chauffeur Alpha",
      notificationBody: state.rideId
        ? "Suivi GPS de la course en cours"
        : "Disponible : localisation active",
      notificationColor: "#00BFA5",
      killServiceOnDestroy: false,
    },
  });
}

let configuration = Promise.resolve();
export function stopDriverLocation(expectedUserId?: string): Promise<void> {
  const operation = configuration.catch(() => undefined).then(() => stop(expectedUserId));
  configuration = operation;
  return operation;
}
export function configureDriverLocation(input: {
  userId: string;
  online?: boolean;
  rideId?: string | null;
  eco: boolean;
}): Promise<void> {
  const operation = configuration.catch(() => undefined).then(() => configure(input));
  configuration = operation;
  return operation;
}
