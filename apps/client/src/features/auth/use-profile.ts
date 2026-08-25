// Profil du compte courant — pour l'avatar (initiale), l'édition C-24, etc.

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@teko/api-client";
import { supabase } from "../../lib/supabase";
import { useSession } from "./use-session";

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: () => getProfile(supabase, userId as string),
  });
}
