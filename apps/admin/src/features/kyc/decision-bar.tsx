"use client";

// Décision globale du dossier (A-03 pied de panneau / AM-03 pied d'écran).
// « Tout valider » n'est actif que si les 6 pièces requises sont conformes ;
// un refus global exige un motif, montré VERBATIM au chauffeur (D-08b).

import { useState } from "react";
import {
  DOC_TYPE_LABELS,
  type DocumentRow,
  frenchApiError,
  pendingRequiredTypes,
} from "./kyc-labels";
import { useKycDecision } from "./use-kyc-actions";

interface DecisionBarProps {
  driverId: string;
  docs: DocumentRow[];
  adminRole: string | null;
}

function blockedReason(props: DecisionBarProps, canDecide: boolean): string | null {
  if (!canDecide) return "Réservé aux admins ops (ou superadmin).";
  const missing = pendingRequiredTypes(props.docs);
  if (missing.length === 0) return null;
  const labels = missing.map((type) => DOC_TYPE_LABELS[type]).join(", ");
  return `Valider d'abord les 6 pièces requises — ${missing.length > 1 ? "restantes" : "restante"} : ${labels}.`;
}

export function DecisionBar(props: DecisionBarProps) {
  const [note, setNote] = useState("");
  const decision = useKycDecision(props.driverId);
  const canDecide = props.adminRole === "ops" || props.adminRole === "superadmin";
  const blocked = blockedReason(props, canDecide);
  const trimmed = note.trim();
  return (
    <div className="border-t border-neutral-100 px-4 py-3 lg:px-5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <input
          data-testid="kyc-note"
          className="h-[38px] min-w-0 flex-1 rounded-[10px] bg-neutral-100 px-3 text-xs outline-none placeholder:text-neutral-400"
          placeholder="Motif de refus (obligatoire si refus) — visible par le chauffeur"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          type="button"
          data-testid="kyc-reject"
          disabled={!canDecide || trimmed.length === 0 || decision.isPending}
          onClick={() => decision.mutate({ accept: false, note: trimmed })}
          className="h-10 flex-none rounded-2xl bg-error-light px-4 text-[13px] font-bold text-error disabled:opacity-50"
        >
          Refuser le dossier
        </button>
        <button
          type="button"
          data-testid="kyc-approve"
          disabled={Boolean(blocked) || decision.isPending}
          onClick={() => decision.mutate({ accept: true })}
          className="h-10 flex-none rounded-2xl bg-gradient-to-br from-brand-700 to-client-accent px-5 text-[13px] font-bold text-neutral-0 shadow-lg shadow-brand-700/35 disabled:opacity-50"
        >
          Tout valider — activer le chauffeur
        </button>
      </div>
      {decision.isError ? (
        <p className="mt-2 text-[11.5px] font-semibold text-error">
          {frenchApiError(decision.error)}
        </p>
      ) : null}
      {blocked ? (
        <p data-testid="kyc-approve-blocked" className="mt-2 text-[11px] text-neutral-500">
          {blocked}
        </p>
      ) : null}
      <p className="mt-2 text-[10.5px] text-neutral-400">
        Un refus exige un motif — il sera montré mot pour mot au chauffeur (D-08b). Action
        journalisée.
      </p>
    </div>
  );
}
