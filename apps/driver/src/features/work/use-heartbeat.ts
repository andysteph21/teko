// Présence chauffeur (D-09 « En ligne ») — driver_heartbeat toutes les 20 s
// avec la position GPS ; premier battement immédiat au passage en ligne,
// arrêt au toggle off / démontage. La présence expire côté backend après
// presence_ttl_s (300 s) : un trou réseau se résorbe seul. Un battement sans
// position (GPS muet, permission retirée) est reflété dans le store : le
// bandeau D-09 l'affiche au lieu de laisser un « En ligne » sans présence.
//
// TODO(doc 11) : service premier plan expo-task-manager + notification
// persistante pour continuer à battre écran éteint / app en arrière-plan —
// l'intervalle JS ci-dessous ne vit qu'au premier plan.

import { driverHeartbeat } from "@teko/api-client";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useWorkStore } from "./store";
import { fetchDevicePosition } from "./use-device-position";

export const HEARTBEAT_MS = 20_000;

export function useHeartbeat(active: boolean, eco: boolean): void {
  const setLocationIssue = useWorkStore((s) => s.setLocationIssue);
  const setDevicePosition = useWorkStore((s) => s.setDevicePosition);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const beat = async () => {
      const position = await fetchDevicePosition();
      if (cancelled) return;
      setLocationIssue(position ? null : "lost");
      if (!position) return;
      setDevicePosition(position);
      await driverHeartbeat(supabase, position, { eco }).catch(() => {
        // Battement raté (réseau) : le suivant corrige, le TTL absorbe.
      });
    };
    void beat();
    const timer = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, eco, setLocationIssue, setDevicePosition]);
}
