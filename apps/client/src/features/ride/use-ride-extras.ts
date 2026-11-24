// Compléments du suivi selon le service de la course : arrêts et dernière
// modification (R3), progression du covoiturage (R4), code de remise et
// colis (R5). Chargements tolérants : un échec n'empêche jamais le suivi.

import {
  acceptedRouteChange,
  deliveryCode,
  getRideParcel,
  listRideStops,
  type RideParcel,
  type RideStop,
  type RouteChange,
  routeChangeRoute,
  type SharedTripProgress,
  sharedTripProgress,
} from "@teko/api-client";
import type { LonLat } from "@teko/maps";
import type { RideRow, RideStatus } from "@teko/types";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouteChangeSignal } from "./route-change-signal";

export const EXTRAS_REFRESH_MS = 15_000;

export type RideKind = "ride" | "shared" | "delivery";

export function rideKind(ride: Pick<RideRow, "service_type" | "category">): RideKind {
  if (ride.service_type === "delivery") return "delivery";
  return ride.category === "covoiturage" ? "shared" : "ride";
}

const EDITABLE: RideStatus[] = ["accepted", "enroute", "arrived", "started"];

/** « Modifier le trajet » : course classique active, jamais covoiturage ni livraison. */
export function canEditRoute(ride: RideRow, status: RideStatus | null): boolean {
  return rideKind(ride) === "ride" && status !== null && EDITABLE.includes(status);
}

export interface RideExtrasData {
  stops: RideStop[];
  /** Dernière modification demandée (en attente, acceptée, refusée, expirée). */
  change: RouteChange | null;
  shared: SharedTripProgress | null;
  deliveryCode: string | null;
  parcel: RideParcel | null;
}

export interface RideExtras extends RideExtrasData {
  kind: RideKind;
  editable: boolean;
  /** Tracé de la modification acceptée, à la place de l'itinéraire initial. */
  changeRoute: LonLat[] | null;
}

const EMPTY: RideExtrasData = {
  stops: [],
  change: null,
  shared: null,
  deliveryCode: null,
  parcel: null,
};

async function quiet<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

export async function loadRideExtras(rideId: string, kind: RideKind): Promise<RideExtrasData> {
  if (kind === "delivery") {
    const [code, parcel] = await Promise.all([
      quiet<string | null>(() => deliveryCode(supabase, rideId), null),
      quiet(() => getRideParcel(supabase, rideId), null),
    ]);
    return { ...EMPTY, deliveryCode: code, parcel };
  }
  if (kind === "shared") {
    const shared = await quiet(() => sharedTripProgress(supabase, rideId), null);
    return { ...EMPTY, shared };
  }
  const [stops, change] = await Promise.all([
    quiet<RideStop[]>(() => listRideStops(supabase, rideId), []),
    quiet(() => acceptedRouteChange(supabase, rideId), null),
  ]);
  return { ...EMPTY, stops, change };
}

function acceptedRoute(change: RouteChange | null): LonLat[] | null {
  if (change?.status !== "accepted") return null;
  try {
    const { coordinates } = routeChangeRoute(change);
    return coordinates.length >= 2 ? coordinates : null;
  } catch {
    return null;
  }
}

export function useRideExtras(ride: RideRow | null, status: RideStatus | null): RideExtras {
  const [data, setData] = useState<RideExtrasData>(EMPTY);
  const version = useRouteChangeSignal((s) => s.version);
  const rideId = ride?.id;
  const kind = ride ? rideKind(ride) : "ride";

  const refresh = useCallback(async () => {
    if (rideId) setData(await loadRideExtras(rideId, kind));
  }, [rideId, kind]);

  // Relu à chaque changement de statut et après une modification acceptée.
  // biome-ignore lint/correctness/useExhaustiveDependencies: déclencheurs voulus
  useEffect(() => {
    void refresh();
  }, [refresh, status, version]);

  // Le covoiturage et les arrêts évoluent sans changement de statut.
  const live = kind === "shared" || data.stops.length > 0;
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void refresh(), EXTRAS_REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, refresh]);

  return {
    ...data,
    kind,
    editable: ride ? canEditRoute(ride, status) : false,
    changeRoute: acceptedRoute(data.change),
  };
}
