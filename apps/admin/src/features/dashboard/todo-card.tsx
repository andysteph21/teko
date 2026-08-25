"use client";

// Bloc « À traiter » — visible < lg uniquement (maquette AM-01) : le desktop
// A-02 porte ces compteurs dans la barre latérale.
//
// Écart assumé : la ligne « Litiges ouverts » de la maquette devient
// « Incidents ouverts » (le backend compte open tous genres confondus).

import type { DashboardCounts } from "@teko/api-client";
import Link from "next/link";
import { useNavBadges } from "../shell/use-nav-badges";

interface TodoRowProps {
  href: string;
  title: string;
  sub: string;
  count: number;
  red?: boolean;
  testId: string;
}

function TodoRow({ href, title, sub, count, red, testId }: TodoRowProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="flex items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 last:border-b-0"
    >
      <p className="min-w-0 flex-1 text-[12.5px] font-semibold text-neutral-800">
        {title}
        <span className="block text-[11px] font-normal text-neutral-500">{sub}</span>
      </p>
      <span
        className={`ml-auto flex h-[26px] min-w-[26px] flex-none items-center justify-center rounded-full px-2 text-xs font-black ${
          red ? "bg-error text-neutral-0" : "bg-warning text-brand-900"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

export function TodoCard({ counts }: { counts?: DashboardCounts }) {
  const badges = useNavBadges(true);
  return (
    <section className="mb-3 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 lg:hidden">
      <header className="border-b border-neutral-100 px-3.5 py-2.5 text-xs font-extrabold text-neutral-900">
        À traiter
      </header>
      <TodoRow
        href="/kyc"
        testId="todo-kyc"
        title="Dossiers KYC en attente"
        sub="à valider ou refuser"
        count={counts?.pendingKyc ?? 0}
      />
      <TodoRow
        href="/map"
        testId="todo-carto"
        title="Propositions carto"
        sub="repères et routes"
        count={badges.carto ?? 0}
      />
      <TodoRow
        href="/incidents"
        testId="todo-incidents"
        title="Incidents ouverts"
        sub="SOS, signalements, litiges"
        count={counts?.openIncidents ?? 0}
        red
      />
    </section>
  );
}
