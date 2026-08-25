"use client";

// Données de la modération carto (A-04) — TanStack Query au-dessus des
// lectures RLS et RPC de validation (@teko/api-client). Les gardes réelles
// (rôle admin) sont côté Postgres.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLandmarkProposals,
  listRoadProposals,
  validateLandmarkProposal,
  validateRoadProposal,
} from "@teko/api-client";
import { supabase } from "../../lib/supabase";
import { buildQueue, landmarkItem, type ModerationItem } from "./proposals";

/** File unifiée des propositions en attente (repères + routes détectées). */
export function useModerationQueue() {
  return useQuery({
    queryKey: ["carto", "queue"],
    queryFn: async (): Promise<ModerationItem[]> => {
      const [landmarks, roads] = await Promise.all([
        listLandmarkProposals(supabase, "proposed"),
        listRoadProposals(supabase, "proposed"),
      ]);
      return buildQueue(landmarks, roads);
    },
  });
}

/** Repères validés récemment. Le backend marque une proposition acceptée
 *  « merged » (fusionnée dans un repère validé), jamais « validated » —
 *  cf. supabase/tests/e2e/landmarks.test.ts. */
export function useRecentlyValidated() {
  return useQuery({
    queryKey: ["carto", "validated"],
    queryFn: async (): Promise<ModerationItem[]> => {
      const rows = await listLandmarkProposals(supabase, "merged");
      // L'API trie par created_at croissant : les 10 derniers, récents d'abord.
      return rows.slice(-10).reverse().map(landmarkItem);
    },
  });
}

export interface ReviewInput {
  item: ModerationItem;
  accept: boolean;
}

/** Valide ou rejette une proposition puis rafraîchit files et pastilles. */
export function useReviewProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, accept }: ReviewInput) => {
      if (item.kind === "landmark") {
        await validateLandmarkProposal(supabase, item.id, accept);
      } else {
        await validateRoadProposal(supabase, item.id, accept);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carto"] });
      queryClient.invalidateQueries({ queryKey: ["nav-badges"] });
    },
  });
}
