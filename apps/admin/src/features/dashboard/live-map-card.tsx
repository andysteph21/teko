"use client";

// Carte « en direct » du tableau de bord (A-02) — légende conforme maquette.
// Masquée < lg : AM-01 ne montre pas de carte sur mobile.

import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("./live-map"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-xs text-neutral-400">
      Chargement de la carte…
    </div>
  ),
});

const LEGEND = [
  { label: "Clients", dot: "bg-client-accent" },
  { label: "Chauffeurs", dot: "bg-driver-accent" },
  { label: "Repères", dot: "bg-warning" },
  { label: "Courses", dot: "bg-brand-800" },
];

export function LiveMapCard() {
  return (
    <section className="hidden min-h-0 flex-[1.6] flex-col overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0 lg:flex">
      <header className="flex items-center border-b border-neutral-100 px-4 py-3 text-[13.5px] font-bold text-neutral-900">
        Carte en direct
        <span className="ml-auto flex gap-3 text-[11px] font-medium text-neutral-500">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <i className={`inline-block h-[9px] w-[9px] rounded-full ${item.dot}`} />
              {item.label}
            </span>
          ))}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <LiveMap />
      </div>
    </section>
  );
}
