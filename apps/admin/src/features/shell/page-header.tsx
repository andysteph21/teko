// Barre de titre d'une page de console (52 px, fond blanc) — maquette A-02.

import type { ReactNode } from "react";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-[52px] flex-none items-center gap-3.5 border-b border-neutral-100 bg-neutral-0 px-5">
      <h1 className="text-base font-bold text-neutral-900">{title}</h1>
      {children}
    </div>
  );
}
