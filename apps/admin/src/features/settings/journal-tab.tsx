"use client";

// Onglet Journal d'audit (A-10) — table append-only : horodatage, acteur,
// action, entité, détail avant/après dépliable ; export CSV côté client.

import type { TableRow } from "@teko/types";
import { useState } from "react";
import { formatDateTime } from "../users/format-date";
import { useDebounced } from "../users/use-users";
import { auditToCsv, downloadCsv } from "./audit-csv";
import { useAuditLog } from "./use-settings";

export function JournalTab() {
  const [input, setInput] = useState("");
  const filter = useDebounced(input);
  const log = useAuditLog(filter);

  return (
    <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <h2 className="text-[13.5px] font-bold">Journal d'audit</h2>
        <span className="rounded-full bg-driver-accent-light px-3 py-1 text-[11px] font-bold text-driver-accent-dark">
          Append-only — aucune entrée modifiable ni supprimable
        </span>
        <button
          type="button"
          data-testid="journal-export"
          disabled={!log.data || log.data.length === 0}
          className="ml-auto h-[34px] rounded-[14px] bg-brand-50 px-4 text-xs font-bold text-brand-800 disabled:opacity-50"
          onClick={() => log.data && downloadCsv(auditToCsv(log.data), "teko-journal-audit.csv")}
        >
          Exporter CSV
        </button>
      </div>
      <div className="border-b border-neutral-100 px-4 py-2.5">
        <input
          type="search"
          data-testid="journal-filter"
          placeholder="Filtrer par action…"
          className="h-[34px] w-full max-w-[280px] rounded-[10px] border border-neutral-200 px-3 text-[12.5px] outline-none placeholder:text-neutral-400"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
      </div>
      {log.isPending ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-neutral-500">Chargement…</p>
      ) : log.isError ? (
        <p className="px-4 py-8 text-center text-[12.5px] font-semibold text-error">
          Lecture impossible. Vérifiez le réseau puis réessayez.
        </p>
      ) : log.data.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-neutral-500">
          Aucune entrée ne correspond à ce filtre.
        </p>
      ) : (
        <JournalTable rows={log.data} />
      )}
    </section>
  );
}

function JournalTable({ rows }: { rows: TableRow<"audit_log">[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            {["Horodatage", "Acteur", "Action", "Entité", "Détail"].map((header) => (
              <th
                key={header}
                className="bg-neutral-50 px-3.5 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-neutral-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <JournalRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JournalRow({ row }: { row: TableRow<"audit_log"> }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = row.before !== null || row.after !== null;
  return (
    <>
      <tr className="border-t border-neutral-100 align-top">
        <td className="whitespace-nowrap px-3.5 py-2 font-mono text-[11px] tabular-nums text-neutral-500">
          {formatDateTime(row.at)}
        </td>
        <td className="whitespace-nowrap px-3.5 py-2">
          {row.actor ? (
            <span className="font-mono text-[11px]">{row.actor.slice(0, 8)}</span>
          ) : (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-neutral-500">
              Système
            </span>
          )}
        </td>
        <td className="px-3.5 py-2 font-semibold">{row.action}</td>
        <td className="px-3.5 py-2 text-neutral-500">
          {row.entity}
          {row.entity_id ? (
            <span className="ml-1 font-mono text-[11px]">{row.entity_id.slice(0, 8)}</span>
          ) : null}
        </td>
        <td className="px-3.5 py-2">
          {hasDetail ? (
            <button
              type="button"
              data-testid={`journal-detail-${row.id}`}
              className="text-[11.5px] font-bold text-brand-800"
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "Replier" : "Détail"}
            </button>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </td>
      </tr>
      {expanded ? <DetailRow row={row} /> : null}
    </>
  );
}

function DetailRow({ row }: { row: TableRow<"audit_log"> }) {
  return (
    <tr className="bg-brand-50/40">
      <td colSpan={5} className="px-3.5 py-2">
        <div className="flex flex-col gap-1 rounded-[10px] border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11px]">
          {row.before !== null ? (
            <span className="text-error-dark">avant · {JSON.stringify(row.before)}</span>
          ) : null}
          {row.after !== null ? (
            <span className="font-bold text-success-dark">après · {JSON.stringify(row.after)}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
