// Données serveur des écrans C-15/16/17 — course, encaissement Airtel
// (poll 3 s : la table payments n'est pas dans la publication Realtime),
// profil du chauffeur (RLS : peut être invisible → repli gracieux).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPayment,
  getRide,
  invokeCollect,
  listPaymentsForRide,
  rideDriverCard,
} from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { supabase } from "../../lib/supabase";

export type PaymentRow = TableRow<"payments">;

const POLL_MS = 3_000;

export function estEnAttente(p: Pick<PaymentRow, "status">): boolean {
  return p.status === "initiated" || p.status === "pending" || p.status === "ambiguous";
}

export function useRide(rideId: string | undefined) {
  return useQuery({
    queryKey: ["ride", rideId],
    enabled: Boolean(rideId),
    queryFn: () => getRide(supabase, rideId as string),
  });
}

/** Dernier encaissement `ride_collection` de la course, suivi par poll de
 *  `getPayment` toutes les 3 s tant qu'il n'est ni success ni failed.
 *  `poll: false` (C-17) : lecture unique, sans relance. */
export function useRideCollection(rideId: string | undefined, enabled: boolean, poll = true) {
  const liste = useQuery({
    queryKey: ["ride-payments", rideId],
    enabled: enabled && Boolean(rideId),
    queryFn: () => listPaymentsForRide(supabase, rideId as string),
    refetchInterval: (q) =>
      !poll || q.state.data?.some((p) => p.kind === "ride_collection") ? false : POLL_MS,
  });
  const initial = liste.data?.find((p) => p.kind === "ride_collection") ?? null;

  const suivi = useQuery({
    queryKey: ["payment", initial?.id],
    enabled: enabled && initial !== null,
    queryFn: () => getPayment(supabase, (initial as PaymentRow).id),
    refetchInterval: (q) =>
      !poll || (q.state.data && !estEnAttente(q.state.data)) ? false : POLL_MS,
  });

  return { payment: suivi.data ?? initial, chargement: enabled && liste.isPending };
}

/** Relance le push USSD sur le paiement en place, puis re-interroge. */
export function useRenvoyerPush(paymentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokeCollect(supabase, paymentId as string),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["payment", paymentId] }),
  });
}

/** Profil du chauffeur — la RLS `profiles` ne l'expose pas au client :
 *  on tente, et on affiche « Votre chauffeur » si rien ne revient. */
export function useDriverCard(rideId: string | null | undefined) {
  return useQuery({
    queryKey: ["driver-card", rideId],
    enabled: Boolean(rideId),
    retry: false,
    queryFn: async () => {
      try {
        return await rideDriverCard(supabase, rideId as string);
      } catch {
        return null;
      }
    },
  });
}
