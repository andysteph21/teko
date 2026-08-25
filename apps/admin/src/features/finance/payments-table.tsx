"use client";

// Paiements récents (payments) — filtre par statut, montants signés selon la
// direction, échecs en rouge avec le code opérateur du payload webhook.

import { formatXaf } from "@teko/core";
import type { TableRow } from "@teko/types";
import { useState } from "react";
import { formatDateTime } from "./business-day";
import { PAYMENT_KIND_LABELS, PAYMENT_STATUS, paymentErrorCode, signedAmount } from "./labels";
import { Panel, TableNote, TD, TH } from "./panel";
import { StatusChip } from "./status-chip";
import { type PaymentFilter, usePayments } from "./use-finance";

const COLUMNS = ["Date", "Type", "Direction", "Montant", "Statut"];

const FILTERS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "success", label: "Confirmés" },
  { value: "failed", label: "Échoués" },
];

function FilterPills({
  filter,
  onChange,
}: {
  filter: PaymentFilter;
  onChange: (filter: PaymentFilter) => void;
}) {
  return (
    <>
      {FILTERS.map((entry) => (
        <button
          key={entry.value}
          type="button"
          data-testid={`payments-filter-${entry.value}`}
          aria-pressed={filter === entry.value}
          onClick={() => onChange(entry.value)}
          className={`h-7 rounded-full px-3 text-[11.5px] font-semibold ${
            filter === entry.value
              ? "bg-brand-100 text-brand-800"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
          }`}
        >
          {entry.label}
        </button>
      ))}
    </>
  );
}

function PaymentRow({ row }: { row: TableRow<"payments"> }) {
  const failed = row.status === "failed";
  const amount = signedAmount(row);
  const errorCode = failed ? paymentErrorCode(row.raw) : null;
  return (
    <tr data-testid="payment-row" className={failed ? "text-error-dark" : "text-neutral-700"}>
      <td className={TD}>{formatDateTime(row.created_at)}</td>
      <td className={TD}>{PAYMENT_KIND_LABELS[row.kind]}</td>
      <td className={TD}>{row.direction === "in" ? "Entrée" : "Sortie"}</td>
      <td
        className={`${TD} font-mono font-bold tabular-nums ${amount < 0 ? "text-error-dark" : ""}`}
      >
        {formatXaf(amount)}
      </td>
      <td className={TD}>
        <StatusChip chip={PAYMENT_STATUS[row.status]} />
        {errorCode ? (
          <span className="ml-1.5 font-mono text-[10.5px] font-bold text-error-dark">
            {errorCode}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

export function PaymentsTable() {
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const payments = usePayments(filter);
  const rows = payments.data ?? [];

  return (
    <Panel title="Paiements récents" actions={<FilterPills filter={filter} onChange={setFilter} />}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className={TH}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PaymentRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <TableNote
        pending={payments.isPending}
        empty={rows.length === 0}
        emptyText="Aucun paiement pour ce filtre."
      />
    </Panel>
  );
}
