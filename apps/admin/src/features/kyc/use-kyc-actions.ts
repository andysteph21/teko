"use client";

// Mutations KYC : revue pièce par pièce puis décision globale (validate_kyc).
// Les gardes réelles sont côté Postgres (RLS + « Réservé aux admins ops »).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewDocument, validateKyc } from "@teko/api-client";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { KycStatus } from "./kyc-labels";

export interface ReviewInput {
  documentId: string;
  status: Extract<KycStatus, "validated" | "rejected">;
  note?: string;
}

export function useReviewDocument(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, status, note }: ReviewInput) =>
      reviewDocument(supabase, documentId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-documents", driverId] });
    },
  });
}

export interface DecisionInput {
  accept: boolean;
  note?: string;
}

/** Décision globale : retour à la file + invalidation des files/pastilles. */
export function useKycDecision(driverId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ accept, note }: DecisionInput) => validateKyc(supabase, driverId, accept, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-queue"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["nav-badges"] });
      router.push("/kyc");
    },
  });
}
