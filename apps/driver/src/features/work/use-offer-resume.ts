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
/** Filet de sécurité en ligne : un événement Realtime ou un push manqué ne
 *  doit pas faire perdre une proposition (retour terrain du 10 nov. 2026). */
export const OFFER_POLL_MS = 5_000;

/** Rattrapage au focus, à la reprise écran éteint, à la réception Expo et
 *  par interrogation périodique tant que l'app est au premier plan. */
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
    const poll = setInterval(() => {
      if (AppState.currentState !== "background" && !offerRef.current) refresh();
    }, OFFER_POLL_MS);
    return () => {
      state.remove();
      push();
      clearInterval(poll);
    };
  }, [userId, online, load, offerRef, refresh]);
  return refresh;
}
