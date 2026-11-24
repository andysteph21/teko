// Devis covoiturage (R4) — à part des catégories classiques : le service est
// fermé par défaut côté serveur. Tout refus masque l'option sans erreur ; le
// prix total (prix par place × places) vient toujours du serveur.

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRideQuote, type RideQuote } from "@teko/api-client";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { type PlacePick, useBookingStore } from "./store";

export interface SharedEstimate {
  /** Vrai seulement quand le serveur a répondu par un devis. */
  available: boolean;
  /** Recalcul en cours après un changement du nombre de places. */
  updating: boolean;
}

/** Range le devis dans le brouillon, ou retire l'option si elle est refusée. */
function storeSharedQuote(quote: RideQuote | null, origin: PlacePick, destination: PlacePick) {
  const store = useBookingStore.getState();
  if (store.origin !== origin || store.destination !== destination) return;
  const { covoiturage: _quote, ...quotes } = store.quotes;
  const { covoiturage: _price, ...estimates } = store.estimates;
  if (quote) {
    useBookingStore.setState({
      quotes: { ...quotes, covoiturage: quote },
      estimates: { ...estimates, covoiturage: Number(quote.price) },
    });
    return;
  }
  useBookingStore.setState({
    quotes,
    estimates,
    ...(store.category === "covoiturage" ? { category: "eco" as const } : {}),
  });
}

export function useSharedEstimate(): SharedEstimate {
  const origin = useBookingStore((s) => s.origin);
  const destination = useBookingStore((s) => s.destination);
  const seats = useBookingStore((s) => s.seats);

  const query = useQuery({
    queryKey: [
      "shared-estimate",
      origin?.position.lon,
      origin?.position.lat,
      destination?.position.lon,
      destination?.position.lat,
      seats,
    ],
    enabled: Boolean(origin && destination),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<RideQuote | null> => {
      if (!origin || !destination) return null;
      try {
        return await getRideQuote(supabase, {
          category: "covoiturage",
          origin: origin.position,
          destination: destination.position,
          seats,
        });
      } catch {
        // Service fermé (service_closed) ou devis indisponible : option masquée.
        return null;
      }
    },
    networkMode: "always",
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  // Le brouillon suit le devis des places affichées, y compris relu du cache.
  const settled = query.isSuccess && !query.isPlaceholderData;
  const quote = query.data ?? null;
  useEffect(() => {
    if (settled && origin && destination) storeSharedQuote(quote, origin, destination);
  }, [settled, quote, origin, destination]);

  return { available: Boolean(quote), updating: query.isFetching || !settled };
}
