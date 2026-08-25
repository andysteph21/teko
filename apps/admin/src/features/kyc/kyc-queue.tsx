"use client";

// A-03 / AM-02 — file d'attente KYC : onglets par statut, dossiers triés par
// ancienneté (engagement 48 h), lien vers le dossier /kyc/[id].

import type { PendingKycRow } from "@teko/api-client";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "../shell/page-header";
import {
  CATEGORY_LABELS,
  initials,
  isNearSla,
  KYC_TABS,
  type KycStatus,
  relativeFr,
} from "./kyc-labels";
import { useKycQueue } from "./use-kyc-queries";

function QueueTabs(props: { active: KycStatus; count?: number; onChange: (s: KycStatus) => void }) {
  return (
    <div className="mb-3 flex gap-2" role="tablist" aria-label="Statut des dossiers">
      {KYC_TABS.map((tab) => {
        const active = tab.status === props.active;
        return (
          <button
            key={tab.status}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`kyc-tab-${tab.status}`}
            onClick={() => props.onChange(tab.status)}
            className={`flex h-8 items-center rounded-full px-3.5 text-xs font-bold ${
              active
                ? "border border-client-accent bg-brand-50 text-brand-700"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
            {active && props.count !== undefined ? ` (${props.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

function QueueRow({ row }: { row: PendingKycRow }) {
  const urgent = row.kyc_status === "pending" && isNearSla(row.created_at);
  const categories = row.categories.map((c) => CATEGORY_LABELS[c]).join(" · ");
  return (
    <Link
      href={`/kyc/${row.id}`}
      data-testid="kyc-row"
      className={`flex items-center gap-3 rounded-[14px] border bg-neutral-0 px-3.5 py-3 hover:border-client-accent ${
        urgent ? "border-warning" : "border-neutral-200"
      }`}
    >
      <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-driver-accent-light text-sm font-extrabold text-driver-accent-dark">
        {initials(row.profiles?.full_name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-neutral-900">
          {row.profiles?.full_name ?? "Chauffeur sans nom"}
        </span>
        <span className="block truncate text-[11.5px] text-neutral-500">
          {categories || "Catégorie non choisie"} · {row.profiles?.phone ?? "—"}
        </span>
      </span>
      <span className="ml-auto flex flex-none items-center gap-2 text-right">
        <span
          className={`font-mono text-xs font-extrabold tabular-nums ${
            urgent ? "text-error" : "text-warning-dark"
          }`}
        >
          {relativeFr(row.created_at)}
        </span>
        <span aria-hidden className="text-lg text-neutral-300">
          ›
        </span>
      </span>
    </Link>
  );
}

function SlaBanner({ rows }: { rows: PendingKycRow[] }) {
  const urgent = rows.filter((row) => isNearSla(row.created_at));
  if (urgent.length === 0) return null;
  const names = urgent
    .slice(0, 3)
    .map((row) => `${row.profiles?.full_name ?? "Chauffeur"} (${relativeFr(row.created_at)})`)
    .join(", ");
  return (
    <p className="mb-2.5 rounded-r-[10px] border-l-[3px] border-warning bg-warning-light px-3 py-2 text-[11.5px] text-neutral-500">
      <strong className="text-warning-dark">
        {urgent.length === 1
          ? "1 dossier approche les 48 h"
          : `${urgent.length} dossiers approchent les 48 h`}
      </strong>{" "}
      — {names}.
    </p>
  );
}

function QueueBody(props: { status: KycStatus; rows?: PendingKycRow[]; error: boolean }) {
  const empty = KYC_TABS.find((tab) => tab.status === props.status)?.empty ?? "Aucun dossier";
  if (props.error) {
    return (
      <p className="py-10 text-center text-sm text-error">Une erreur est survenue. Réessayez.</p>
    );
  }
  if (!props.rows) {
    return <p className="py-10 text-center text-sm text-neutral-400">Chargement…</p>;
  }
  if (props.rows.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-400">{empty}</p>;
  }
  return (
    <>
      {props.status === "pending" ? <SlaBanner rows={props.rows} /> : null}
      <div className="flex flex-col gap-2">
        {props.rows.map((row) => (
          <QueueRow key={row.id} row={row} />
        ))}
      </div>
    </>
  );
}

export function KycQueue() {
  const [status, setStatus] = useState<KycStatus>("pending");
  const { data, isError } = useKycQueue(status);
  const pendingCount = status === "pending" && data ? data.length : undefined;
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Validation KYC">
        <span className="text-xs text-neutral-500">
          {pendingCount !== undefined
            ? `${pendingCount} ${pendingCount > 1 ? "dossiers" : "dossier"} en attente · engagement 48 h`
            : "Engagement 48 h · triés par ancienneté"}
        </span>
      </PageHeader>
      <div className="mx-auto w-full max-w-[720px] flex-1 p-4 lg:px-5">
        <QueueTabs active={status} count={data?.length} onChange={setStatus} />
        <QueueBody status={status} rows={data} error={isError} />
      </div>
    </div>
  );
}
