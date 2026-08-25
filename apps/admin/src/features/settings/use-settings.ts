"use client";

// Données des onglets Paramètres / Équipe / Journal (A-07, A-08, A-10).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteAdmin,
  listAdminInvites,
  listAppConfig,
  listAuditLog,
  listProfiles,
  updateAppConfig,
} from "@teko/api-client";
import type { DbEnum, Json } from "@teko/types";
import { supabase } from "../../lib/supabase";

export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    queryFn: () => listAppConfig(supabase),
  });
}

export function useUpdateAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Json }) =>
      updateAppConfig(supabase, key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-config"] }),
  });
}

export function useAdminTeam() {
  return useQuery({
    queryKey: ["admin-team"],
    queryFn: () => listProfiles(supabase, { role: "admin" }),
  });
}

export function useAdminInvites() {
  return useQuery({
    queryKey: ["admin-invites"],
    queryFn: () => listAdminInvites(supabase),
  });
}

export function useInviteAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, role }: { phone: string; role: DbEnum<"admin_role"> }) =>
      inviteAdmin(supabase, phone, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-invites"] }),
  });
}

export function useAuditLog(action: string) {
  return useQuery({
    queryKey: ["audit-log", action],
    queryFn: () => listAuditLog(supabase, { limit: 200, ...(action ? { action } : {}) }),
  });
}
