"use client";

// Requêtes du tableau de bord (A-02) et de la page incidents (AM-06) —
// polling léger (pas de Realtime admin pour l'instant, voir TODO carte).

import { useQuery } from "@tanstack/react-query";
import { dashboardCounts, listIncidents, listRecentRides } from "@teko/api-client";
import { supabase } from "../../lib/supabase";

export function useDashboardCounts() {
  return useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: () => dashboardCounts(supabase),
    refetchInterval: 30_000,
  });
}

/** 100 courses récentes : flux d'activité + volume du jour côté client. */
export function useRecentRides() {
  return useQuery({
    queryKey: ["recent-rides"],
    queryFn: () => listRecentRides(supabase, 100),
    refetchInterval: 30_000,
  });
}

/** Partagée dashboard (30 s) / page incidents (15 s) — même clé, TanStack
 *  applique le plus court des intervalles observés. */
export function useIncidents(refetchMs = 30_000) {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: () => listIncidents(supabase),
    refetchInterval: refetchMs,
  });
}
