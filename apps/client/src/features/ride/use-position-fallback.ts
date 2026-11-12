// Repli du suivi véhicule : la dernière position connue est lue à l'ouverture
// puis toutes les 10 s tant que la course est attribuée. Un événement temps
// réel manqué (réseau mobile, reprise d'app) ne fige plus le point du
// chauffeur — retour terrain du 11 novembre 2026.

import { latestRidePosition, type RidePositionEvent } from "@teko/api-client";
import type { RideStatus } from "@teko/types";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

export const POSITION_POLL_MS = 10_000;
const TRACKED: RideStatus[] = ["accepted", "enroute", "arrived", "started"];

export function usePositionFallback(
  rideId: string | undefined,
  status: RideStatus | null,
  onPosition: (event: RidePositionEvent) => void,
): void {
  const tracked = status !== null && TRACKED.includes(status);
  useEffect(() => {
    if (!rideId || !tracked) return;
    let cancelled = false;
    const read = () => {
      void latestRidePosition(supabase, rideId)
        .then((event) => {
          if (event && !cancelled) onPosition(event);
        })
        .catch(() => undefined);
    };
    read();
    const timer = setInterval(read, POSITION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [rideId, tracked, onPosition]);
}
