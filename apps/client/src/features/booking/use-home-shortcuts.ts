// Raccourcis de l'accueil (C-07) : option de service présélectionnée et
// destination récente préremplie — deux écrans de moins pour un trajet
// habituel. Sans départ connu ou sans position, la recherche reste le chemin.

import type { VehicleCategory } from "@teko/types";
import { type Href, useRouter } from "expo-router";
import type { RecentDestination } from "../places/use-recent-destinations";
import { useBookingStore } from "./store";

export interface HomeShortcuts {
  category: VehicleCategory;
  setCategory: (category: VehicleCategory) => void;
  openRecent: (recent: RecentDestination) => void;
  /** Recherche d'une destination pour une course (jamais une livraison). */
  openSearch: () => void;
}

export function useHomeShortcuts(): HomeShortcuts {
  const router = useRouter();
  const category = useBookingStore((s) => s.category);
  const setCategory = useBookingStore((s) => s.setCategory);
  const origin = useBookingStore((s) => s.origin);
  const setDestination = useBookingStore((s) => s.setDestination);
  const setService = useBookingStore((s) => s.setService);

  const openSearch = () => {
    setService("ride");
    router.push("/(main)/search" as Href);
  };

  const openRecent = (recent: RecentDestination) => {
    setService("ride");
    if (!origin || !recent.position) {
      router.push("/(main)/search" as Href);
      return;
    }
    setDestination({
      position: recent.position,
      label: recent.label,
      landmarkId: recent.landmarkId,
      hint: recent.hint,
    });
    router.push("/(main)/category" as Href);
  };

  return { category, setCategory, openRecent, openSearch };
}
