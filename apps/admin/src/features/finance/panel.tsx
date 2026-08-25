// Panneau blanc + styles de table — maquette A-05 (th uppercase, lignes
// séparées) ; sur mobile la table défile dans son conteneur (AM-05).

import type { ReactNode } from "react";

export const TH =
  "bg-neutral-50 px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-neutral-500";
export const TD = "border-t border-neutral-100 px-4 py-2.5";

export function Panel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-2.5">
        <h2 className="text-[13.5px] font-bold text-neutral-900">{title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export function TableNote({
  pending,
  empty,
  emptyText,
}: {
  pending: boolean;
  empty: boolean;
  emptyText: string;
}) {
  if (pending) return <p className="px-4 py-3 text-xs text-neutral-500">Chargement…</p>;
  if (empty) return <p className="px-4 py-3 text-xs text-neutral-500">{emptyText}</p>;
  return null;
}
