// Lieux enregistrés du compte (C-08) : Domicile / Travail / favoris.

import { useQuery } from "@tanstack/react-query";
import { listSavedPlaces } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { supabase } from "../../lib/supabase";

export function useSavedPlaces(): TableRow<"saved_places">[] {
  const query = useQuery({
    queryKey: ["saved-places"],
    queryFn: () => listSavedPlaces(supabase),
    staleTime: 60_000,
  });
  return query.data ?? [];
}
