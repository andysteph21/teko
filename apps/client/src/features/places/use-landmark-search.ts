// Recherche de repères en direct (C-08) — saisie anti-rebond ~300 ms puis
// searchLandmarksByName (repères VALIDÉS uniquement, tri par salience).

import { useQuery } from "@tanstack/react-query";
import { searchLandmarksByName } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export interface LandmarkSearchState {
  results: TableRow<"landmarks">[];
  /** La requête (anti-rebond passé) est-elle en cours ? */
  searching: boolean;
  /** Requête effective ≥ 2 caractères — les sections repos sont masquées. */
  active: boolean;
}

export function useLandmarkSearch(query: string): LandmarkSearchState {
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const active = debounced.length >= MIN_QUERY_LENGTH;
  const result = useQuery({
    queryKey: ["landmark-search", debounced],
    queryFn: () => searchLandmarksByName(supabase, debounced),
    enabled: active,
    staleTime: 30_000,
  });

  return {
    results: result.data ?? [],
    searching: active && result.isPending,
    active,
  };
}
