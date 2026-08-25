// Destinations récentes (C-07/C-08) — dérivées de l'historique des courses
// terminées : libellé = indication saisie, sinon date de la course.

import { useQuery } from "@tanstack/react-query";
import { listMyRides } from "@teko/api-client";
import { supabase } from "../../lib/supabase";

export interface RecentDestination {
  id: string;
  label: string;
  when: string;
}

const DAY_MS = 86_400_000;

export function relativeDayLabel(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", { weekday: "long" });
}

export function useRecentDestinations(): RecentDestination[] {
  const query = useQuery({
    queryKey: ["recent-destinations"],
    queryFn: () => listMyRides(supabase, 10),
    staleTime: 60_000,
  });
  const rides = query.data ?? [];
  return rides
    .filter((r) => r.status === "completed" && (r.dest_hint || r.dest_landmark_id))
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      label: r.dest_hint ?? "Course précédente",
      when: relativeDayLabel(r.created_at),
    }));
}
