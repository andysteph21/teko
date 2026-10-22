// Suivi de course temps réel (C-13 → C-14) — la vérité vit côté backend :
// getRide au montage puis canal positions/statut (ADR-13). L'ETA se recalcule
// depuis la position véhicule ; la fraîcheur des positions nourrit le bandeau
// « position figée » (contrat du spike, doc 11 §1).

import {
  createRealtimePositionsChannel,
  getRide,
  getRidePin,
  type RidePositionEvent,
  rideDriverCard,
} from "@teko/api-client";
import { costingForCategory, fetchRoute, type GeomInput, type LonLat, toLonLat } from "@teko/maps";
import type { RideRow, RideStatus } from "@teko/types";
import { type Href, useRouter } from "expo-router";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
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
  /** Prénom du chauffeur — null si la fiche est indisponible. */
  driverName: string | null;
  origin: LonLat | null;
  destination: LonLat | null;
  loadError: boolean;
  reload: () => void;
}

function safeLonLat(geom: unknown): LonLat | null {
  if (geom == null) return null;
  try {
    return toLonLat(geom as GeomInput);
  } catch {
    return null;
  }
}

/** Prénom du chauffeur via la fiche participant (RPC ride_driver_card) —
 *  repli « Votre chauffeur » si indisponible. */
async function fetchDriverName(ride: RideRow): Promise<string | null> {
  if (!ride.driver_id) return null;
  try {
    const card = await rideDriverCard(supabase, ride.id);
    return card?.firstName ?? null;
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

/** Ligne de course + chargements dérivés (prénom chauffeur, itinéraire). */
function useRideRow(rideId: string | undefined) {
  const [ride, setRide] = useState<RideRow | null>(null);
  const [status, setStatus] = useState<RideStatus | null>(null);
  const [routeCoords, setRouteCoords] = useState<LonLat[]>([]);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!rideId) return;
    try {
      const [row, pin] = await Promise.all([
        getRide(supabase, rideId),
        getRidePin(supabase, rideId),
      ]);
      setRide({ ...row, pin_code: pin });
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

  return { ride, status, setStatus, routeCoords, driverName, loadError, load };
}

/** ETA véhicule → point de rencontre, au fil des positions (≥ 30 s d'écart). */
function useEta(statusRef: RefObject<RideStatus | null>, rideRef: RefObject<RideRow | null>) {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const lastEtaAt = useRef(0);

  const refreshEta = useCallback(
    async (from: LonLat) => {
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
    },
    [statusRef, rideRef],
  );

  return { etaMin, refreshEta };
}

/** Positions véhicule + fraîcheur (bandeau « position figée » > 15 s). */
function useVehiclePositions(refreshEta: (from: LonLat) => Promise<void>) {
  const [vehicle, setVehicle] = useState<LonLat | null>(null);
  const [positionStale, setPositionStale] = useState(false);
  const lastPositionAt = useRef<number | null>(null);

  const handlePosition = useCallback(
    (event: RidePositionEvent) => {
      const recordedAt = Date.parse(event.recordedAt);
      if (!Number.isFinite(recordedAt) || recordedAt < (lastPositionAt.current ?? 0)) return;
      lastPositionAt.current = recordedAt;
      const stale = Date.now() - recordedAt > STALE_POSITION_MS;
      setPositionStale(stale);
      const position = { lon: event.lon, lat: event.lat };
      setVehicle(position);
      if (!stale) void refreshEta(position);
    },
    [refreshEta],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const last = lastPositionAt.current;
      if (last !== null && Date.now() - last > STALE_POSITION_MS) setPositionStale(true);
    }, STALE_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  return { vehicle, positionStale, handlePosition };
}

/** Réactions aux statuts backend : completed → paiement, annulations → accueil. */
function useStatusHandler(
  rideId: string | undefined,
  setStatus: (s: RideStatus) => void,
  load: () => Promise<void>,
  rideRef: RefObject<RideRow | null>,
) {
  const router = useRouter();
  const { t } = useTranslation();
  return useCallback(
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
    [rideId, setStatus, load, rideRef, router, t],
  );
}

/** Abonnements Realtime (statut + positions) — ADR-13, via PositionsChannel. */
function useRideChannel(
  rideId: string | undefined,
  onStatus: (s: RideStatus) => void,
  onPosition: (e: RidePositionEvent) => void,
) {
  useEffect(() => {
    if (!rideId) return;
    const channel = createRealtimePositionsChannel(supabase);
    const offStatus = channel.subscribeRideStatus(rideId, onStatus);
    const offPositions = channel.subscribeRidePositions(rideId, onPosition);
    return () => {
      void offStatus();
      void offPositions();
    };
  }, [rideId, onStatus, onPosition]);
}

export function useRideTracking(rideId: string | undefined): RideTracking {
  const { ride, status, setStatus, routeCoords, driverName, loadError, load } = useRideRow(rideId);

  const statusRef = useRef<RideStatus | null>(null);
  const rideRef = useRef<RideRow | null>(null);
  statusRef.current = status;
  rideRef.current = ride;

  const { etaMin, refreshEta } = useEta(statusRef, rideRef);
  const { vehicle, positionStale, handlePosition } = useVehiclePositions(refreshEta);
  const handleStatus = useStatusHandler(rideId, setStatus, load, rideRef);
  useRideChannel(rideId, handleStatus, handlePosition);

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
