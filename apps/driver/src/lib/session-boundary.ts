import type { QueryClient } from "@tanstack/react-query";
import { GPS_QUEUE_TTL_MS } from "@teko/core";
import { useWorkStore } from "../features/work/store";
import { clearGpsQueue, gpsQueue } from "./gps-queue";
import { setHistoryCacheOwner } from "./history-cache";
import { stopDriverLocation } from "./location-service";
import { readLocationState } from "./location-state";
import { supabase } from "./supabase";

export function attachSessionBoundary(cache: QueryClient): () => void {
  let owner: string | null | undefined;
  const subscription = supabase.auth.onAuthStateChange((_event, session) => {
    const next = session?.user.id ?? null;
    if (next !== owner) {
      cache.clear();
      setHistoryCacheOwner(next);
      useWorkStore.setState({
        online: false,
        devicePosition: null,
        locationIssue: null,
        toast: null,
      });
      // Conserver la file après un redémarrage avec le même compte : la purge
      // ciblée à la reprise exclut les points étrangers et ceux de plus de 24 h.
      if (owner !== undefined) void clearGpsQueue().catch(() => undefined);
      else if (next)
        void gpsQueue.purge(next, Date.now() - GPS_QUEUE_TTL_MS).catch(() => undefined);
      else void clearGpsQueue().catch(() => undefined);
      owner = next;
      // Reprendre uniquement l'état du même compte après redémarrage. Le
      // changement de compte arrête le service et ne réutilise jamais sa file.
      void readLocationState()
        .then(async (state) => {
          if (owner !== next) return;
          if (!next || state?.userId !== next) await stopDriverLocation(state?.userId);
          else useWorkStore.setState({ online: state.online });
        })
        .catch(() => undefined);
    }
  });
  return () => subscription.data.subscription.unsubscribe();
}
