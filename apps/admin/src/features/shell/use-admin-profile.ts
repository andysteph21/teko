"use client";

// Profil de l'admin connecté — la garde réelle est la RLS ; ici on ne fait
// qu'adapter l'interface au rôle (menus, pages accessibles).

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { supabase } from "../../lib/supabase";

export type AdminProfile = TableRow<"profiles">;

export function useAdminProfile(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(supabase, userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const profile = query.data ?? null;
  return {
    profile,
    isAdmin: profile?.role === "admin",
    adminRole: profile?.admin_role ?? null,
    loading: query.isPending,
  };
}

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  ops: "Ops",
  carto: "Cartographie",
  finance: "Finance",
  superadmin: "Superadmin",
};
