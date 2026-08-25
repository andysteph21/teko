"use client";

// Carte d'un incident (AM-06 adaptée en liste) — SOS ouverts en rouge vif.
// La garde réelle des actions est côté Postgres (RLS admin).

import type { DbEnum } from "@teko/types";
import type { IncidentRow } from "./activity";
import { formatEventTime, shortRideId } from "./activity";

const KIND_LABELS: Record<DbEnum<"incident_kind">, string> = {
  sos: "SOS",
  report: "Signalement",
  dispute: "Litige",
};

const STATUS_PILLS: Record<DbEnum<"incident_status">, { text: string; className: string }> = {
  open: { text: "Ouvert", className: "bg-error-light text-error-dark" },
  in_progress: { text: "Pris en charge", className: "bg-warning-light text-warning-dark" },
  resolved: { text: "Résolu", className: "bg-success-light text-success-dark" },
};

interface IncidentCardProps {
  incident: IncidentRow;
  busy: boolean;
  onTake: () => void;
  onResolve: () => void;
}

export function IncidentCard({ incident, busy, onTake, onResolve }: IncidentCardProps) {
  const sosOpen = incident.kind === "sos" && incident.status !== "resolved";
  const pill = STATUS_PILLS[incident.status];
  return (
    <article
      data-testid={`incident-${incident.id}`}
      className={`rounded-[14px] border bg-neutral-0 px-3.5 py-3 ${
        sosOpen ? "border-error border-l-4" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`text-[13px] font-extrabold ${sosOpen ? "text-error-dark" : "text-neutral-900"}`}
        >
          {KIND_LABELS[incident.kind]}
        </span>
        <span className="font-mono text-[11px] text-neutral-400">
          {formatEventTime(incident.created_at)}
        </span>
        {incident.ride_id ? (
          <span className="font-mono text-[11px] text-neutral-500">
            course {shortRideId(incident.ride_id)}
          </span>
        ) : null}
        <span
          className={`ml-auto flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold ${pill.className}`}
        >
          {pill.text}
        </span>
      </div>
      {incident.message ? (
        <p className="mt-1.5 text-[12.5px] text-neutral-700">{incident.message}</p>
      ) : null}
      {incident.status !== "resolved" ? (
        <div className="mt-2.5 flex gap-2">
          {incident.status === "open" ? (
            <button
              type="button"
              data-testid={`incident-take-${incident.id}`}
              disabled={busy}
              onClick={onTake}
              className="h-9 flex-1 rounded-xl bg-warning-light text-[12.5px] font-extrabold text-warning-dark disabled:opacity-50"
            >
              Prendre en charge
            </button>
          ) : null}
          <button
            type="button"
            data-testid={`incident-resolve-${incident.id}`}
            disabled={busy}
            onClick={onResolve}
            className="h-9 flex-1 rounded-xl bg-success-light text-[12.5px] font-extrabold text-success-dark disabled:opacity-50"
          >
            Marquer résolu
          </button>
        </div>
      ) : null}
    </article>
  );
}
