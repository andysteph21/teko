// Position du passager à la commande — second point, magenta, à côté du
// point de rencontre (décision du porteur du 12 novembre 2026). Lue après
// l'acceptation et jusqu'à la prise en charge ; le serveur l'efface ensuite.

import { rideClientPosition } from "@teko/api-client";
import type { LonLat } from "@teko/maps";
import type { RideStatus } from "@teko/types";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export const CLIENT_POSITION_POLL_MS = 20_000;
const PICKUP: RideStatus[] = ["accepted", "enroute", "arrived"];

export function useClientPosition(
  rideId: string | undefined,
  status: RideStatus | null,
): LonLat | null {
  const [position, setPosition] = useState<LonLat | null>(null);
  const pickup = status !== null && PICKUP.includes(status);
  useEffect(() => {
    if (!rideId || !pickup) {
      setPosition(null);
      return;
    }
    let cancelled = false;
    const read = () => {
      void rideClientPosition(supabase, rideId)
        .then((point) => {
          if (!cancelled) setPosition(point);
        })
        .catch(() => undefined);
    };
    read();
    const timer = setInterval(read, CLIENT_POSITION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [rideId, pickup]);
  return position;
}
