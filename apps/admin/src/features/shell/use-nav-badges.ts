"use client";

// Pastilles de navigation (KYC à traiter, propositions carto) — rafraîchies
// toutes les 60 s, silencieuses en cas d'erreur (la nav reste utilisable).

import { useQuery } from "@tanstack/react-query";
import { listKycQueue, listLandmarkProposals, listRoadProposals } from "@teko/api-client";
import { supabase } from "../../lib/supabase";
import type { NavBadges } from "./nav";

export function useNavBadges(enabled: boolean): NavBadges {
  const { data } = useQuery({
    queryKey: ["nav-badges"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async (): Promise<NavBadges> => {
      const [kyc, landmarks, roads] = await Promise.all([
        listKycQueue(supabase),
        listLandmarkProposals(supabase),
        listRoadProposals(supabase),
      ]);
      return { kyc: kyc.length, carto: landmarks.length + roads.length };
    },
  });
  return { kyc: data?.kyc || undefined, carto: data?.carto || undefined };
}
