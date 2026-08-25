// Suivi de course temps réel (C-13 → C-14) — la vérité vit côté backend :
// getRide au montage puis canal positions/statut (ADR-13). L'ETA se recalcule
// depuis la position véhicule ; la fraîcheur des positions nourrit le bandeau
// « position figée » (contrat du spike, doc 11 §1).

import {
  createRealtimePositionsChannel,
  getProfile,
  getRide,
  type RidePositionEvent,
} from "@teko/api-client";
import {
  costingForCategory,
  fetchRoute,
  type GeomInput,
  type LonLat,
  toLonLat,
} from "@teko/maps";
import type { RideRow, RideStatus } from "@teko/types";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { VALHALLA_URL } from "../../config";
import { supabase } from "../../lib/supabase";

/** Latence max avant bandeau « position figée » (doc 11 : tolérer les trous). */
export const STALE_POSITION_MS = 15_000;
/** Période minimale entre deux recalculs d'ETA.
 *  TODO: vrai throttle (annulation de la requête en vol, backoff réseau). */
const ETA_REFRESH_MS = 30_000;
const STALE_CHECK_MS = 5_000;

const TERMINAL_STATUSES: RideStatus[] = [
  "completed",
  "cancelled_client",
  "cancelled_driver",
  "no_show",
  "no_answer",
  "failed",
];

export interface RideTracking {
  ride: RideRow | null;
  status: RideStatus | null;
  vehicle: LonLat | null;
  routeCoords: LonLat[];
  etaMin: number | null;
  positionStale: boolean;
  /** Prénom du chauffeur — null si le profil est illisible (RLS self-only). */
  driverName: string | null;
  origin: LonLat | null;
  destination: LonLat | null;
  loadError: boolean;
  reload: () => void;
}

function firstName(fullName: string | null): string | null {
  const name = (fullName ?? "").trim();
  return name === "" ? null : (name.split(/\s+/)[0] ?? null);
}

function safeLonLat(geom: unknown): LonLat | null {
  if (geom == null) return null;
  try {
    return toLonLat(geom as GeomInput);
  } catch {
    return null;
  }
}

/** Prénom du chauffeur — la RLS de `profiles` est « self or admin » : côté
 *  client la lecture échoue tant que le backend n'expose pas de fiche
 *  chauffeur aux participants ; on retombe sur « Votre chauffeur ». */
async function fetchDriverName(ride: RideRow): Promise<string | null> {
  if (!ride.driver_id) return null;
  try {
    const profile = await getProfile(supabase, ride.driver_id);
    return firstName(profile.full_name);
  } catch {
    return null;
  }
}

/** Itinéraire origine → destination (tracé violet C-13/C-14). Valhalla
 *  injoignable → pas de tracé, l'écran reste utilisable. */
async function fetchItinerary(ride: RideRow): Promise<LonLat[]> {
  const origin = safeLonLat(ride.origin_geom);
  const dest = safeLonLat(ride.dest_geom);
  if (!origin || !dest) return [];
  try {
    const route = await fetchRoute(VALHALLA_URL, origin, dest, costingForCategory(ride.category));
    return route.coordinates;
  } catch {
    return [];
  }
}

export function useRideTracking(rideId: string | undefined): RideTracking {
  const router = useRouter();
  const { t } = useTranslation();
  const [ride, setRide] = useState<RideRow | null>(null);
  const [status, setStatus] = useState<RideStatus | null>(null);
  const [vehicle, setVehicle] = useState<LonLat | null>(null);
  const [routeCoords, setRouteCoords] = useState<LonLat[]>([]);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [positionStale, setPositionStale] = useState(false);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const lastPositionAt = useRef<number | null>(null);
  const lastEtaAt = useRef(0);
  const statusRef = useRef<RideStatus | null>(null);
  const rideRef = useRef<RideRow | null>(null);
  statusRef.current = status;
  rideRef.current = ride;

  const load = useCallback(async () => {
    if (!rideId) return;
    try {
      const row = await getRide(supabase, rideId);
      setRide(row);
      setStatus(row.status);
      setLoadError(false);
      void fetchDriverName(row).then(setDriverName);
      void fetchItinerary(row).then(setRouteCoords);
    } catch {
      setLoadError(true);
    }
  }, [rideId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** ETA véhicule → point de rencontre, au fil des positions (≥ 30 s d'écart). */
  const refreshEta = useCallback(async (from: LonLat) => {
    const s = statusRef.current;
    if (s !== "accepted" && s !== "enroute") return;
    if (Date.now() - lastEtaAt.current < ETA_REFRESH_MS) return;
    lastEtaAt.current = Date.now();
    const origin = safeLonLat(rideRef.current?.origin_geom);
    if (!origin) return;
    try {
      const route = await fetchRoute(VALHALLA_URL, from, origin);
      setEtaMin(Math.max(1, Math.round(route.durationS / 60)));
    } catch {
      // Réseau — on garde la dernière ETA connue.
    }
  }, []);

  const handleStatus = useCallback(
    (next: RideStatus) => {
      setStatus(next);
      if (next === "completed") {
        router.replace(`/(main)/payment/${rideId}` as Href);
        return;
      }
      if (next === "cancelled_driver") {
        Alert.alert(t("ride:suivi.annuleTitre"), t("ride:suivi.annuleChauffeurTexte"));
        router.replace("/(main)/home" as Href);
        return;
      }
      if (TERMINAL_STATUSES.includes(next)) {
        router.replace("/(main)/home" as Href);
        return;
      }
      // Chauffeur attribué après le montage : recharger la ligne (PIN, driver_id).
      if (!rideRef.current?.driver_id) void load();
    },
    [rideId, router, t, load],
  );

  const handlePosition = useCallback(
    (event: RidePositionEvent) => {
      lastPositionAt.current = Date.now();
      setPositionStale(false);
      const position = { lon: event.lon, lat: event.lat };
      setVehicle(position);
      void refreshEta(position);
    },
    [refreshEta],
  );

  useEffect(() => {
    if (!rideId) return;
    const channel = createRealtimePositionsChannel(supabase);
    const offStatus = channel.subscribeRideStatus(rideId, handleStatus);
    const offPositions = channel.subscribeRidePositions(rideId, handlePosition);
    return () => {
      void offStatus();
      void offPositions();
    };
  }, [rideId, handleStatus, handlePosition]);

  useEffect(() => {
    const timer = setInterval(() => {
      const last = lastPositionAt.current;
      if (last !== null && Date.now() - last > STALE_POSITION_MS) setPositionStale(true);
    }, STALE_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  return {
    ride,
    status,
    vehicle,
    routeCoords,
    etaMin,
    positionStale,
    driverName,
    origin: safeLonLat(ride?.origin_geom),
    destination: safeLonLat(ride?.dest_geom),
    loadError,
    reload: () => void load(),
  };
}
