"use client";

// Colonne méta du dossier (A-03 panneau droit) : Airtel Money, catégories,
// état du dossier. Véhicule : lecture absente de admin.ts (TODO listVehicles).

import type { TableRow } from "@teko/types";
import type { ReactNode } from "react";
import { CATEGORY_LABELS, DOC_STATUS_PILL, relativeFr } from "./kyc-labels";

const MVP_CATEGORIES = ["eco", "moto", "confort"] as const;

function MetaCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-0 px-3.5 py-3">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.6px] text-neutral-500">
        {label}
      </p>
      {children}
    </div>
  );
}

export function MetaCards({ driver }: { driver: TableRow<"drivers"> }) {
  const pill = DOC_STATUS_PILL[driver.kyc_status];
  return (
    <div className="flex flex-col gap-2">
      <MetaCard label="Numéro Airtel Money">
        <p className="font-mono text-[12.5px] font-semibold tabular-nums">
          {driver.payout_msisdn ?? "Non renseigné"}
        </p>
      </MetaCard>
      <MetaCard label="Catégorie attribuée">
        <div className="flex gap-1.5">
          {MVP_CATEGORIES.map((category) => {
            const on = driver.categories.includes(category);
            return (
              <span
                key={category}
                className={`flex-1 rounded-full border-[1.5px] py-1 text-center text-xs font-semibold ${
                  on
                    ? "border-driver-accent bg-driver-accent-light text-driver-accent-dark"
                    : "border-neutral-200 text-neutral-500"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </span>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10.5px] text-neutral-400">
          Catégorie proposée par le chauffeur, confirmée à la validation.
        </p>
      </MetaCard>
      <MetaCard label="Dossier">
        <p className="text-[12.5px]">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase ${pill.className}`}
          >
            {pill.label}
          </span>{" "}
          · déposé {relativeFr(driver.created_at)}
        </p>
        {driver.deactivated_reason ? (
          <p className="mt-1 text-[11.5px] text-error-dark">Motif : {driver.deactivated_reason}</p>
        ) : null}
      </MetaCard>
    </div>
  );
}
