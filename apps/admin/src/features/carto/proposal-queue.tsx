"use client";

// Volet file de modération (A-04 droite / AM-04 bas) : propositions en
// attente + repères validés récemment, notes d'exploitation en pied.

import { useState } from "react";
import { ProposalCard } from "./proposal-card";
import {
  categoryLabel,
  formatProposalDate,
  type ModerationItem,
  reviewErrorMessage,
} from "./proposals";
import { useRecentlyValidated, useReviewProposal } from "./use-proposals";

interface ProposalQueueProps {
  items: ModerationItem[];
  loading: boolean;
  error: boolean;
  selectedId: string | null;
  onSelect: (item: ModerationItem) => void;
}

function TabButton({
  active,
  testid,
  onClick,
  children,
}: {
  active: boolean;
  testid: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 font-semibold text-xs ${
        active ? "bg-brand-50 text-brand-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {children}
    </button>
  );
}

function PendingList({ items, loading, error, selectedId, onSelect }: ProposalQueueProps) {
  const review = useReviewProposal();
  if (loading) {
    return <p className="px-4 py-6 text-neutral-400 text-sm">Chargement des propositions…</p>;
  }
  if (error) {
    return <p className="px-4 py-6 text-error text-sm">Impossible de charger les propositions.</p>;
  }
  return (
    <>
      {review.isError ? (
        <p className="border-neutral-100 border-b bg-error-light px-4 py-2 font-semibold text-error-dark text-xs">
          {reviewErrorMessage(review.error)}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="px-4 py-6 text-neutral-400 text-sm">Aucune proposition en attente.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <ProposalCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              busy={review.isPending && review.variables?.item.id === item.id}
              onSelect={onSelect}
              onReview={(target, accept) => review.mutate({ item: target, accept })}
            />
          ))}
        </ul>
      )}
      <p className="px-4 py-2.5 text-[11px] text-neutral-400 leading-snug">
        Un repère validé apparaît dans la recherche client immédiatement.
      </p>
    </>
  );
}

function ValidatedList() {
  const validated = useRecentlyValidated();
  if (validated.isPending) {
    return <p className="px-4 py-6 text-neutral-400 text-sm">Chargement…</p>;
  }
  const rows = validated.data ?? [];
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-neutral-400 text-sm">Aucun repère validé récemment.</p>;
  }
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((item) => (
        <li key={item.id} className="border-neutral-100 border-b px-4 py-2.5">
          <span className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-neutral-900">{item.title}</span>
            <span className="rounded-full bg-success-light px-2 py-0.5 font-extrabold text-[10px] text-success-dark uppercase">
              Validé
            </span>
            <span className="ml-auto flex-none text-[10.5px] text-neutral-400">
              {formatProposalDate(item.createdAt)}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] text-neutral-500">
            {categoryLabel(item.category)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProposalQueue(props: ProposalQueueProps) {
  const [tab, setTab] = useState<"pending" | "validated">("pending");
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="File de modération">
      <div className="flex flex-none gap-1.5 border-neutral-100 border-b px-4 py-2.5">
        <TabButton
          active={tab === "pending"}
          testid="carto-tab-pending"
          onClick={() => setTab("pending")}
        >
          {props.items.length > 0
            ? `${props.items.length} proposition${props.items.length > 1 ? "s" : ""} en attente`
            : "En attente"}
        </TabButton>
        <TabButton
          active={tab === "validated"}
          testid="carto-tab-validated"
          onClick={() => setTab("validated")}
        >
          Validés récemment
        </TabButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "pending" ? <PendingList {...props} /> : <ValidatedList />}
      </div>
      <footer className="flex-none border-neutral-100 border-t px-4 py-2.5 text-[10.5px] text-neutral-400 leading-snug">
        TODO : la reconstruction du graphe routier (Valhalla) reste manuelle — CL-05.
      </footer>
    </section>
  );
}
