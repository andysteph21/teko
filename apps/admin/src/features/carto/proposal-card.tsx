"use client";

// Carte d'une proposition dans la file de modération (A-04 / AM-04) :
// badge de type, indication, actions Valider / Rejeter avec confirmation.

import { useState } from "react";
import { formatProposalDate, type ModerationItem } from "./proposals";

const BADGES = {
  landmark: { label: "Repère", className: "bg-warning-light text-warning-dark" },
  road: { label: "Route", className: "bg-driver-accent-light text-driver-accent-dark" },
} as const;

interface ProposalCardProps {
  item: ModerationItem;
  selected: boolean;
  busy: boolean;
  onSelect: (item: ModerationItem) => void;
  onReview: (item: ModerationItem, accept: boolean) => void;
}

function ConfirmRow({
  item,
  accept,
  onConfirm,
  onCancel,
}: {
  item: ModerationItem;
  accept: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const question = accept
    ? item.kind === "road"
      ? "Intégrer cette route au graphe ?"
      : "Valider ce repère ?"
    : "Rejeter cette proposition ?";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-neutral-700">{question}</span>
      <button
        type="button"
        data-testid={`carto-confirm-${item.id}`}
        onClick={onConfirm}
        className={`h-8 rounded-xl px-3.5 text-xs font-bold ${
          accept ? "bg-success-light text-success-dark" : "bg-error-light text-error-dark"
        }`}
      >
        Confirmer
      </button>
      <button
        type="button"
        data-testid={`carto-cancel-${item.id}`}
        onClick={onCancel}
        className="h-8 rounded-xl bg-neutral-100 px-3.5 text-xs font-bold text-neutral-600"
      >
        Annuler
      </button>
    </div>
  );
}

export function ProposalCard({ item, selected, busy, onSelect, onReview }: ProposalCardProps) {
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const badge = BADGES[item.kind];

  return (
    <li className={`border-neutral-100 border-b px-4 py-3 ${selected ? "bg-brand-50" : ""}`}>
      <button
        type="button"
        data-testid={`carto-item-${item.id}`}
        onClick={() => onSelect(item)}
        className="w-full text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-[13.5px] font-bold text-neutral-900">{item.title}</span>
          <span
            className={`rounded-full px-2 py-0.5 font-extrabold text-[10px] uppercase ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="ml-auto flex-none text-[10.5px] text-neutral-400">
            {formatProposalDate(item.createdAt)}
          </span>
        </span>
        <span className="mt-1 block text-[11.5px] text-neutral-500 leading-snug">
          {item.detail}
        </span>
      </button>
      {confirming === null ? (
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            data-testid={`carto-validate-${item.id}`}
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="h-8 rounded-xl bg-success-light px-3.5 text-xs font-bold text-success-dark disabled:opacity-50"
          >
            {item.kind === "road" ? "Intégrer au graphe" : "Valider"}
          </button>
          <button
            type="button"
            data-testid={`carto-reject-${item.id}`}
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="h-8 rounded-xl bg-error-light px-3.5 text-xs font-bold text-error-dark disabled:opacity-50"
          >
            {item.kind === "road" ? "Rejeter" : "Refuser"}
          </button>
        </div>
      ) : (
        <ConfirmRow
          item={item}
          accept={confirming}
          onConfirm={() => {
            setConfirming(null);
            onReview(item, confirming);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </li>
  );
}
