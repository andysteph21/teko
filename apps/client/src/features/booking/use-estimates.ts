// Itinéraire réel (Valhalla) + estimation ferme par catégorie (backend).
// Le prix affiché en C-10 est GARANTI (décision n° 6) : c'est le backend qui
// calcule, l'app ne fait que router et afficher.

import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "@tanstack/react-query";
import { getRideQuote, quoteRoute, TekoApiError } from "@teko/api-client";
import type { LonLat, RouteResult } from "@teko/maps";
import type { VehicleCategory } from "@teko/types";
import { supabase } from "../../lib/supabase";
import { useBookingStore } from "./store";

const CATEGORIES: VehicleCategory[] = ["eco", "moto", "confort"];

async function fetchQuotes(origin: LonLat, destination: LonLat) {
  try {
    return await Promise.all(
      CATEGORIES.map(async (category) => {
        const quote = await getRideQuote(supabase, { category, origin, destination });
        return [category, quote] as const;
      }),
    );
  } catch (error) {
    let offline = false;
    try {
      const network = await NetInfo.fetch();
      offline = network.isConnected === false || network.isInternetReachable === false;
    } catch {
      /* Un état réseau inconnu ne prouve pas une déconnexion. */
    }
    if (offline) throw new TekoApiError("network", "Connexion indisponible", error);
    if (error instanceof TekoApiError && error.code === "network")
      throw new TekoApiError("unknown", "Service de tarifs inaccessible", error);
    throw error;
  }
}

export interface EstimatesResult {
  route: RouteResult;
  estimates: Partial<Record<VehicleCategory, number>>;
}

/** Route l'itinéraire (auto) puis demande le prix ferme de chaque catégorie.
 *  La moto est re-routée en costing motorcycle pour sa durée propre. */
export function useEstimates() {
  const origin = useBookingStore((s) => s.origin);
  const destination = useBookingStore((s) => s.destination);
  const setRouteAndEstimates = useBookingStore((s) => s.setRouteAndEstimates);
  const setQuotes = useBookingStore((s) => s.setQuotes);

  return useQuery({
    queryKey: [
      "estimates",
      origin?.position.lon,
      origin?.position.lat,
      destination?.position.lon,
      destination?.position.lat,
    ],
    enabled: Boolean(origin && destination),
    staleTime: 60_000,
    queryFn: async (): Promise<EstimatesResult> => {
      if (!origin || !destination) throw new Error("brouillon incomplet");
      const quotes = await fetchQuotes(origin.position, destination.position);
      const byCategory = Object.fromEntries(quotes);
      const category = useBookingStore.getState().category;
      const selected = byCategory[category];
      if (!selected) throw new Error("Catégorie indisponible pendant l’alpha");
      const route = quoteRoute(selected);
      const estimates = Object.fromEntries(quotes.map(([key, q]) => [key, Number(q.price)]));
      const current = useBookingStore.getState();
      if (current.origin === origin && current.destination === destination) {
        setQuotes(byCategory);
        setRouteAndEstimates(route, estimates);
      }
      return { route, estimates };
    },
    networkMode: "always",
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
