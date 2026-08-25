"use client";

// Données de l'écran A-06 — recherche de profils, index chauffeurs et
// suspension motivée. Les gardes réelles (motif, rôle) restent en base.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listKycQueue, listProfiles, type PendingKycRow, setDriverActive } from "@teko/api-client";
import type { DbEnum } from "@teko/types";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export type RoleFilter = "all" | DbEnum<"user_role">;

export const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "client", label: "Clients" },
  { id: "driver", label: "Chauffeurs" },
  { id: "admin", label: "Admins" },
];

/** Valeur retardée de 300 ms — évite une requête PostgREST par frappe. */
export function useDebounced(value: string, delayMs = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useProfiles(search: string, role: RoleFilter) {
  return useQuery({
    queryKey: ["admin-profiles", search, role],
    queryFn: () =>
      listProfiles(supabase, {
        ...(search ? { search } : {}),
        ...(role === "all" ? {} : { role }),
      }),
  });
}

// TODO backend : pas de wrapper admin `listDrivers`/`getDriver` dans
// @teko/api-client — on reconstitue l'index des chauffeurs en lisant la file
// KYC sur les trois statuts. À remplacer dès qu'un wrapper dédié existe.
export function useDriversIndex() {
  return useQuery({
    queryKey: ["admin-drivers-index"],
    queryFn: async () => {
      const statuses: DbEnum<"kyc_status">[] = ["pending", "validated", "rejected"];
      const queues = await Promise.all(statuses.map((status) => listKycQueue(supabase, status)));
      const index = new Map<string, PendingKycRow>();
      for (const row of queues.flat()) index.set(row.id, row);
      return index;
    },
  });
}

export interface DriverActiveInput {
  driverId: string;
  active: boolean;
  reason?: string;
}

export function useSetDriverActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, active, reason }: DriverActiveInput) =>
      setDriverActive(supabase, driverId, active, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-drivers-index"] }),
  });
}
