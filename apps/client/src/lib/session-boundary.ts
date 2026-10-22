import type { QueryClient } from "@tanstack/react-query";
import { useBookingStore } from "../features/booking/store";
import { setHistoryCacheOwner } from "./history-cache";
import { supabase } from "./supabase";

/** Installation unique à la racine : ne laisse aucun cache au compte suivant. */
export function attachSessionBoundary(cache: QueryClient): () => void {
  let owner: string | null | undefined;
  const subscription = supabase.auth.onAuthStateChange((_event, session) => {
    const next = session?.user.id ?? null;
    if (next !== owner) {
      cache.clear();
      setHistoryCacheOwner(next);
      useBookingStore.getState().reset();
      owner = next;
    }
  });
  return () => subscription.data.subscription.unsubscribe();
}
