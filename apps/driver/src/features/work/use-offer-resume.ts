import { listPendingOffers, type OfferDetails } from "@teko/api-client";
import { useFocusEffect } from "expo-router";
import { type RefObject, useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { onPushOffer } from "../../lib/push-events";
import { supabase } from "../../lib/supabase";

interface ResumeOptions {
  userId: string | undefined;
  online: boolean;
  load: (id: string) => Promise<void>;
  offerRef: RefObject<OfferDetails | null>;
}
/** Rattrapage au focus, à la reprise écran éteint et à la réception Expo. */
export function useOfferResume({ userId, online, load, offerRef }: ResumeOptions): () => void {
  const refresh = useCallback(() => {
    if (!userId || !online) return;
    void listPendingOffers(supabase)
      .then((rows) => {
        const fresh = rows.find((r) => Date.parse(r.expires_at) > Date.now());
        if (fresh && !offerRef.current) void load(fresh.id);
      })
      .catch(() => undefined);
  }, [userId, online, load, offerRef]);
  useFocusEffect(refresh);
  useEffect(() => {
    if (!userId || !online) return;
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") refresh();
    });
    const push = onPushOffer((id) => {
      if (!offerRef.current) void load(id);
    });
    return () => {
      state.remove();
      push();
    };
  }, [userId, online, load, offerRef, refresh]);
  return refresh;
}
