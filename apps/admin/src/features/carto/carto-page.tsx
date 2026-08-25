"use client";

// A-04 / AM-04 — cartographie : carte (gauche / haut en mobile) + file de
// modération (droite / bas). L'édition fine (tracés, zones tarifaires)
// arrive dans un lot ultérieur : onglets présents mais inactifs (maquette).

import type { LonLat } from "@teko/maps";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PageHeader } from "../shell/page-header";
import { ProposalQueue } from "./proposal-queue";
import type { ModerationItem } from "./proposals";
import { useModerationQueue } from "./use-proposals";

const CartoMap = dynamic(() => import("./carto-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
      Chargement de la carte…
    </div>
  ),
});

/** Onglets de la maquette non couverts par ce lot — affichés inactifs. */
const UPCOMING_TABS = ["Édition routes", "Repères", "Zones tarifaires"];

export function CartoPage() {
  const queue = useModerationQueue();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<LonLat[] | null>(null);
  const items = queue.data ?? [];

  function selectItem(item: ModerationItem) {
    setSelectedId(item.id);
    if (item.points.length > 0) setFocus(item.points);
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col lg:h-dvh">
      <PageHeader title="Cartographie">
        <div className="hidden gap-1.5 md:flex">
          <span className="rounded-full bg-brand-50 px-3.5 py-1.5 font-semibold text-brand-700 text-xs">
            Propositions
          </span>
          {UPCOMING_TABS.map((label) => (
            <span
              key={label}
              title="À venir"
              className="cursor-not-allowed rounded-full bg-neutral-100 px-3.5 py-1.5 font-semibold text-neutral-400 text-xs"
            >
              {label}
            </span>
          ))}
        </div>
      </PageHeader>
      <p className="flex-none border-neutral-100 border-b bg-neutral-0 px-5 py-1.5 text-[11.5px] text-neutral-500 lg:hidden">
        L'édition fine des routes se fait sur ordinateur.
      </p>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-60 flex-none lg:h-auto lg:flex-[1.5]">
          <CartoMap items={items} focus={focus} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col border-neutral-200 border-t bg-neutral-0 lg:w-[360px] lg:flex-none lg:border-t-0 lg:border-l">
          <ProposalQueue
            items={items}
            loading={queue.isPending}
            error={queue.isError}
            selectedId={selectedId}
            onSelect={selectItem}
          />
        </div>
      </div>
    </div>
  );
}
