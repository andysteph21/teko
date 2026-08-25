"use client";

// Relevés du jour (daily_statements) — filtre par jour métier (début 04 h 00),
// totaux de colonnes en pied. Les numériques PostgREST arrivent en strings.

import { formatXaf } from "@teko/core";
import type { TableRow } from "@teko/types";
import { useState } from "react";
import { businessDayOf } from "./business-day";
import { STATEMENT_STATUS } from "./labels";
import { Panel, TableNote, TD, TH } from "./panel";
import { StatusChip } from "./status-chip";
import { useStatements } from "./use-finance";

type Statement = TableRow<"daily_statements">;

const COLUMNS = ["Chauffeur", "Ouverture", "Commissions", "Crédits Airtel", "Clôture", "Statut"];

function toneFor(value: number): string {
  if (value < 0) return "text-error-dark";
  if (value > 0) return "text-success-dark";
  return "text-neutral-700";
}

function Amount({ value, colored, testId }: { value: number; colored?: boolean; testId?: string }) {
  return (
    <td
      data-testid={testId}
      className={`${TD} font-mono tabular-nums ${colored ? `font-bold ${toneFor(value)}` : "text-neutral-700"}`}
    >
      {formatXaf(value)}
    </td>
  );
}

function StatementLine({ row }: { row: Statement }) {
  return (
    <tr data-testid="statement-row">
      {/* TODO backend : jointure profiles pour afficher le nom du chauffeur. */}
      <td className={`${TD} font-mono text-xs text-neutral-600`} title={row.driver_id}>
        {row.driver_id.slice(0, 8)}
      </td>
      <Amount value={Number(row.opening)} />
      <Amount value={Number(row.total_commission)} />
      <Amount value={Number(row.total_mobile_credit)} />
      <Amount value={Number(row.closing)} colored />
      <td className={TD}>
        <StatusChip chip={STATEMENT_STATUS[row.status]} />
      </td>
    </tr>
  );
}

function sum(rows: Statement[], pick: (row: Statement) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

function TotalsRow({ rows }: { rows: Statement[] }) {
  return (
    <tr data-testid="statements-totals" className="bg-neutral-50">
      <td className={`${TD} text-[10.5px] font-bold uppercase tracking-wider text-neutral-500`}>
        Totaux
      </td>
      <Amount value={sum(rows, (r) => Number(r.opening))} />
      <Amount
        value={sum(rows, (r) => Number(r.total_commission))}
        testId="statements-total-commission"
      />
      <Amount value={sum(rows, (r) => Number(r.total_mobile_credit))} />
      <Amount
        value={sum(rows, (r) => Number(r.closing))}
        colored
        testId="statements-total-closing"
      />
      <td className={TD} />
    </tr>
  );
}

export function StatementsTable() {
  const [day, setDay] = useState(() => businessDayOf(new Date()));
  const statements = useStatements(day);
  const rows = statements.data ?? [];

  return (
    <Panel
      title="Relevés du jour"
      actions={
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
          Jour métier
          <input
            type="date"
            data-testid="statements-day"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="h-8 rounded-lg border border-neutral-200 bg-neutral-0 px-2 text-xs text-neutral-700"
          />
        </label>
      }
    >
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
              <StatementLine key={row.id} row={row} />
            ))}
          </tbody>
          <tfoot>{rows.length > 0 ? <TotalsRow rows={rows} /> : null}</tfoot>
        </table>
      </div>
      <TableNote
        pending={statements.isPending}
        empty={rows.length === 0}
        emptyText="Aucun relevé pour ce jour. La clôture de 04 h 00 les génère."
      />
    </Panel>
  );
}
