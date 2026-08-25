"use client";

// Lectures KYC (TanStack Query) — tout passe par @teko/api-client (RLS admin).

import { useQuery } from "@tanstack/react-query";
import {
  getKycFileUrl,
  getMyDriver,
  getProfile,
  listDriverDocuments,
  listKycQueue,
} from "@teko/api-client";
import { supabase } from "../../lib/supabase";
import type { KycStatus } from "./kyc-labels";

export function useKycQueue(status: KycStatus) {
  return useQuery({
    queryKey: ["kyc-queue", status],
    queryFn: () => listKycQueue(supabase, status),
    refetchInterval: 60_000,
  });
}

/** Fiche chauffeur (ligne drivers + profil). TODO listVehicles côté admin.ts
 *  pour afficher le véhicule (marque, plaque) — pas de lecture véhicule ici. */
export function useKycDriver(driverId: string) {
  return useQuery({
    queryKey: ["kyc-driver", driverId],
    queryFn: async () => {
      const [driver, profile] = await Promise.all([
        getMyDriver(supabase, driverId),
        getProfile(supabase, driverId),
      ]);
      return { driver, profile };
    },
  });
}

export function useDriverDocuments(driverId: string) {
  return useQuery({
    queryKey: ["kyc-documents", driverId],
    queryFn: () => listDriverDocuments(supabase, driverId),
  });
}

/** URL signée (bucket privé `kyc`, 300 s) — rafraîchie avant expiration. */
export function useKycFileUrl(storagePath: string) {
  return useQuery({
    queryKey: ["kyc-file-url", storagePath],
    queryFn: () => getKycFileUrl(supabase, storagePath),
    staleTime: 240_000,
    refetchInterval: 240_000,
  });
}
