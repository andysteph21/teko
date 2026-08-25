// Course active côté chauffeur (D-11 → D-14) — la vérité vit côté backend :
// getRide au montage puis canal statut (ADR-13). L'itinéraire suit la phase :
// véhicule → point de rencontre (accepted/enroute), puis vers la destination
// (started) — la destination n'est jamais montrée avant le démarrage.

import { createRealtimePositionsChannel, getRide } from "@teko/api-client";
import { costingForCategory, fetchRoute, type GeomInput, type LonLat, toLonLat } from "@teko/maps";
import type { RideRow, RideStatus } from "@teko/types";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { VALHALLA_URL } from "../../config";
import { supabase } from "../../lib/supabase";
import { useWorkStore } from "./store";
import { fetchDevicePosition } from "./use-device-position";

export interface DriverRide {
  ride: RideRow | null;
  status: RideStatus | null;
  routeCoords: LonLat[];
  origin: LonLat | null;
  destination: LonLat | null;
  loadError: boolean;
  reload: () => void;
  /** Ligne retournée par un RPC (mark_arrived, start_ride, complete_ride). */
  applyRide: (row: RideRow) => void;
}

export function safeLonLat(geom: unknown): LonLat | null {
  if (geom == null) return null;
  try {
    return toLonLat(geom as GeomInput);
  } catch {
    return null;
  }
}

type RoutePhase = "pickup" | "dropoff" | null;

function phaseOf(status: RideStatus | null): RoutePhase {
  if (status === "accepted" || status === "enroute") return "pickup";
  if (status === "started") return "dropoff";
  return null;
}

/** Valhalla injoignable → pas de tracé, l'écran reste utilisable. */
async function computeRoute(ride: RideRow, phase: Exclude<RoutePhase, null>): Promise<LonLat[]> {
  const origin = safeLonLat(ride.origin_geom);
  const dest = safeLonLat(ride.dest_geom);
  const costing = costingForCategory(ride.category);
  try {
    if (phase === "pickup") {
      const from = await fetchDevicePosition();
      if (!from || !origin) return [];
      return (await fetchRoute(VALHALLA_URL, from, origin, costing)).coordinates;
    }
    if (!origin || !dest) return [];
    return (await fetchRoute(VALHALLA_URL, origin, dest, costing)).coordinates;
  } catch {
    return [];
  }
}

function useRouteCoords(ride: RideRow | null, status: RideStatus | null): LonLat[] {
  const [routeCoords, setRouteCoords] = useState<LonLat[]>([]);
  const phase = phaseOf(status);
  useEffect(() => {
    if (!ride || !phase) {
      setRouteCoords([]);
      return;
    }
    let cancelled = false;
    void computeRoute(ride, phase).then((coords) => {
      if (!cancelled) setRouteCoords(coords);
    });
    return () => {
      cancelled = true;
    };
  }, [ride, phase]);
  return routeCoords;
}

export function useDriverRide(rideId: string | undefined): DriverRide {
  const [ride, setRide] = useState<RideRow | null>(null);
  const [status, setStatus] = useState<RideStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const showToast = useWorkStore((s) => s.showToast);

  const load = useCallback(async () => {
    if (!rideId) return;
    try {
      const row = await getRide(supabase, rideId);
      setRide(row);
      setStatus(row.status);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [rideId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = useCallback(
    (next: RideStatus) => {
      setStatus(next);
      if (next === "completed") {
        // Relire la ligne : price_final et completed_at arrivent avec la clôture.
        void load();
        return;
      }
      if (next === "cancelled_client") {
        showToast(t("work:course.annuleeClient"));
        router.replace("/(main)/home" as Href);
        return;
      }
      if (next === "cancelled_driver" || next === "no_show" || next === "failed") {
        router.replace("/(main)/home" as Href);
      }
    },
    [load, router, showToast, t],
  );

  useEffect(() => {
    if (!rideId) return;
    const channel = createRealtimePositionsChannel(supabase);
    const off = channel.subscribeRideStatus(rideId, handleStatus);
    return () => void off();
  }, [rideId, handleStatus]);

  const applyRide = useCallback((row: RideRow) => {
    setRide(row);
    setStatus(row.status);
  }, []);

  return {
    ride,
    status,
    routeCoords: useRouteCoords(ride, status),
    origin: safeLonLat(ride?.origin_geom),
    destination: status === "started" ? safeLonLat(ride?.dest_geom) : null,
    loadError,
    reload: () => void load(),
    applyRide,
  };
}
