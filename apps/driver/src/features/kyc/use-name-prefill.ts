// Pré-remplissage prénom/nom (D-04) : un client existant qui devient
// chauffeur a déjà un nom de profil — on le propose sans écraser la saisie.

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@teko/api-client";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

type SetName = (updater: (value: string) => string) => void;

export function useNamePrefill(
  userId: string | undefined,
  setFirstName: SetName,
  setLastName: SetName,
): void {
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(supabase, userId as string),
    enabled: Boolean(userId),
  });
  const fullName = profile.data?.full_name;
  useEffect(() => {
    if (!fullName) return;
    const [first = "", ...rest] = fullName.trim().split(/\s+/);
    setFirstName((v) => v || first);
    setLastName((v) => v || rest.join(" "));
  }, [fullName, setFirstName, setLastName]);
}
