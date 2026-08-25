// Itinéraire réel (Valhalla) + estimation ferme par catégorie (backend).
// Le prix affiché en C-10 est GARANTI (décision n° 6) : c'est le backend qui
// calcule, l'app ne fait que router et afficher.

import { useQuery } from "@tanstack/react-query";
import { estimatePrice } from "@teko/api-client";
import { costingForCategory, fetchRoute, type RouteResult } from "@teko/maps";
import type { VehicleCategory } from "@teko/types";
import { VALHALLA_URL } from "../../config";
import { supabase } from "../../lib/supabase";
import { useBookingStore } from "./store";

const CATEGORIES: VehicleCategory[] = ["eco", "moto", "confort"];

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
      const route = await fetchRoute(VALHALLA_URL, origin.position, destination.position, "auto");
      const entries = await Promise.all(
        CATEGORIES.map(async (category) => {
          const forCat =
            costingForCategory(category) === "auto"
              ? route
              : await fetchRoute(VALHALLA_URL, origin.position, destination.position, "motorcycle");
          const price = await estimatePrice(supabase, {
            category,
            distanceM: forCat.distanceM,
            durationS: forCat.durationS,
          });
          return [category, price] as const;
        }),
      );
      const estimates = Object.fromEntries(entries) as Partial<Record<VehicleCategory, number>>;
      setRouteAndEstimates(route, estimates);
      return { route, estimates };
    },
  });
}
