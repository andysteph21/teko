"use client";

// Accès données de la page Finance (A-05) — tout passe par @teko/api-client ;
// les gardes réelles (superadmin, ops) sont côté Postgres.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCommission,
  listPayments,
  listStatements,
  runDailyClose,
  setCommission,
} from "@teko/api-client";
import type { DbEnum } from "@teko/types";
import { supabase } from "../../lib/supabase";

export interface CommissionValue {
  type: string;
  value: number;
}

export type PaymentFilter = DbEnum<"payment_status"> | "all";

export function useCommission() {
  return useQuery({
    queryKey: ["finance", "commission"],
    queryFn: () => getCommission(supabase),
    staleTime: 60_000,
  });
}

export function useStatements(businessDay: string) {
  return useQuery({
    queryKey: ["finance", "statements", businessDay],
    queryFn: () => listStatements(supabase, businessDay),
  });
}

export function usePayments(filter: PaymentFilter) {
  return useQuery({
    queryKey: ["finance", "payments", filter],
    queryFn: () => listPayments(supabase, filter === "all" ? undefined : filter),
  });
}

export function useSetCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (next: { type: "percent" | "fixed"; value: number }) =>
      setCommission(supabase, next.type, next.value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "commission"] }),
  });
}

export function useDailyClose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runDailyClose(supabase),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "statements"] }),
  });
}
