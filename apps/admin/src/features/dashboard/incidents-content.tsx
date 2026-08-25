"use client";

// Liste des incidents & SOS (AM-06, accessible desktop depuis le flux A-02).
// Polling 15 s — Realtime non requis pour ce lot. Enum backend : le
// « accusé de réception » de la maquette correspond à `in_progress`.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateIncident } from "@teko/api-client";
import type { DbEnum } from "@teko/types";
import { supabase } from "../../lib/supabase";
import { sortIncidents } from "./activity";
import { apiErrorText } from "./api-error";
import { IncidentCard } from "./incident-card";
import { useIncidents } from "./use-dashboard-data";

type IncidentStatus = DbEnum<"incident_status">;

const CONFIRMATIONS: Partial<Record<IncidentStatus, string>> = {
  in_progress: "Prendre en charge cet incident ? L'action est inscrite au journal d'audit.",
  resolved: "Marquer cet incident comme résolu ? L'action est inscrite au journal d'audit.",
};

export function IncidentsContent() {
  const query = useIncidents(15_000);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      updateIncident(supabase, id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });

  const act = (id: string, status: IncidentStatus) => {
    const message = CONFIRMATIONS[status];
    if (message && !window.confirm(message)) return;
    mutation.mutate({ id, status });
  };

  const incidents = sortIncidents(query.data ?? []);
  const openCount = incidents.filter((i) => i.status !== "resolved").length;

  return (
    <div className="mx-auto max-w-[720px] p-4 lg:px-5 lg:py-4">
      {mutation.error ? (
        <p className="mb-3 rounded-xl bg-error-light px-3.5 py-2.5 text-[12.5px] font-semibold text-error-dark">
          {apiErrorText(mutation.error)}
        </p>
      ) : null}
      <p className="mb-3 text-[12.5px] text-neutral-500">
        {query.isPending
          ? "Chargement…"
          : openCount > 0
            ? `${openCount} incident${openCount > 1 ? "s" : ""} à traiter — les SOS sont en tête, priorité absolue.`
            : "Aucun incident à traiter."}
      </p>
      <div className="flex flex-col gap-2.5">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            busy={mutation.isPending}
            onTake={() => act(incident.id, "in_progress")}
            onResolve={() => act(incident.id, "resolved")}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-[10.5px] text-neutral-400">
        Chaque action est horodatée au journal d'audit.
      </p>
    </div>
  );
}
