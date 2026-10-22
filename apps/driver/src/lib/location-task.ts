// Chargé globalement : Android livre aussi les points écran éteint.
import {
  createRealtimePositionsChannel,
  driverHeartbeat,
  getRide,
  getSessionIdentity,
  TekoApiError,
} from "@teko/api-client";
import { drainGpsQueue, GPS_QUEUE_TTL_MS } from "@teko/core";
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";
import { devicePoint } from "../config";
import { enqueueGpsPoint, gpsQueue } from "./gps-queue";
import {
  configureDriverLocation,
  DRIVER_LOCATION_TASK,
  stopDriverLocation,
} from "./location-service";
import {
  type DriverLocationState,
  readLocationState,
  replaceLocationState,
} from "./location-state";
import { supabase } from "./supabase";

async function refreshRide(next: DriverLocationState, now: number) {
  if (next.rideId && now - next.lastRideCheckAt >= 15000) {
    try {
      const ride = await getRide(supabase, next.rideId);
      if (!["accepted", "enroute", "arrived", "started"].includes(ride.status)) next.rideId = null;
      next.lastRideCheckAt = now;
    } catch {
      /* L'état connu permet de conserver les points hors réseau. */
    }
  }
}

async function refreshState(state: DriverLocationState, point: { lon: number; lat: number }) {
  const next = { ...state };
  const now = Date.now();
  await refreshRide(next, now);
  if (next.online && now - next.lastHeartbeatAt >= 20000) {
    try {
      await driverHeartbeat(supabase, point, { eco: next.eco });
      next.lastHeartbeatAt = now;
    } catch (error) {
      if (error instanceof TekoApiError && error.code === "not_authorized") next.online = false;
    }
  }
  if (await replaceLocationState(state, next)) {
    if (!next.online && !next.rideId) await configureDriverLocation({ ...next });
  }
}

let processing = false;
export async function processDriverLocation(location: LocationObject): Promise<void> {
  const state = await readLocationState();
  if (!state) return;
  const identity = await getSessionIdentity(supabase);
  if (identity.status === "available" && identity.userId !== state.userId) {
    await stopDriverLocation(state.userId);
    return;
  }
  const oldest = Date.now() - GPS_QUEUE_TTL_MS;
  await gpsQueue.purge(state.userId, oldest);
  const point = devicePoint({ lon: location.coords.longitude, lat: location.coords.latitude });
  // D'abord persister : une panne réseau ne doit pas perdre la mesure.
  if (state.rideId && location.timestamp > oldest)
    await enqueueGpsPoint({
      userId: state.userId,
      rideId: state.rideId,
      ...point,
      recordedAt: location.timestamp,
    });
  // Une livraison native simultanée persiste ses points, même si le réseau
  // du traitement précédent est lent. Seul l'envoi réseau est sérialisé.
  if (identity.status === "unavailable" || processing) return;
  processing = true;
  try {
    await refreshState(state, point);
    if ((await readLocationState())?.userId !== state.userId) return;
    const channel = createRealtimePositionsChannel(supabase, {
      eco: state.eco,
      driverId: state.userId,
    });
    await drainGpsQueue({
      userId: state.userId,
      storage: gpsQueue,
      send: (sample) =>
        channel.pushRidePosition(sample.rideId, sample, {
          id: sample.id,
          recordedAt: new Date(sample.recordedAt).toISOString(),
        }),
    });
  } finally {
    processing = false;
  }
}

TaskManager.defineTask<{ locations: LocationObject[] }>(
  DRIVER_LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;
    try {
      for (const location of data.locations) await processDriverLocation(location);
    } catch {
      /* Les points déjà persistés restent dans la file de 24 h. */
    }
  },
);
