// Envoi de la position pendant la course (D-13) — toutes les 5 s (10 s en
// éco), via le PositionsChannel (ADR-13, jamais Realtime en direct). Actif
// tant que l'écran est monté et que la course est démarrée.

import { createRealtimePositionsChannel } from "@teko/api-client";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { fetchDevicePosition } from "./use-device-position";

export const PUSH_MS = 5_000;
export const PUSH_ECO_MS = 10_000;

export function usePushPositions(rideId: string | undefined, active: boolean, eco: boolean): void {
  useEffect(() => {
    if (!rideId || !active) return;
    const channel = createRealtimePositionsChannel(supabase, { eco });
    let cancelled = false;
    const push = async () => {
      const position = await fetchDevicePosition();
      if (!position || cancelled) return;
      await channel.pushRidePosition(rideId, position).catch(() => {
        // Envoi raté (réseau) : le passager voit « position figée », le
        // prochain tick corrige.
      });
    };
    void push();
    const timer = setInterval(() => void push(), eco ? PUSH_ECO_MS : PUSH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [rideId, active, eco]);
}
