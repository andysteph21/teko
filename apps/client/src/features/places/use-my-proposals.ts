// Propositions de repères du compte (C-31) — tous statuts, plus récentes
// d'abord (tri fait par l'api-client).

import { useQuery } from "@tanstack/react-query";
import { listMyLandmarkProposals } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { supabase } from "../../lib/supabase";

export interface MyProposalsState {
  proposals: TableRow<"landmark_proposals">[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

/** `validated` et `merged` comptent tous deux comme « accepté » : le repère
 *  est visible sur la carte dans les deux cas. */
export function isAcceptedProposal(status: TableRow<"landmark_proposals">["status"]): boolean {
  return status === "merged" || status === "validated";
}

export function useMyProposals(): MyProposalsState {
  const query = useQuery({
    queryKey: ["my-landmark-proposals"],
    queryFn: () => listMyLandmarkProposals(supabase),
  });
  return {
    proposals: query.data ?? [],
    loading: query.isPending,
    error: query.isError,
    refetch: () => void query.refetch(),
  };
}
