"use client";

// Onglet Paramètres (A-07) — table clé/valeur d'app_config, édition JSON
// inline réservée au superadmin. Les clés sensibles sont signalées (garde
// Postgres « guard_sensitive_config ») ; la commission s'édite côté Finance.

import type { TableRow } from "@teko/types";
import { useState } from "react";
import { formatDate } from "../users/format-date";
import { useAdminRole } from "./use-admin-role";
import { useAppConfig, useUpdateAppConfig } from "./use-settings";

/** Miroir de guard_sensitive_config (migration 20260605121400). */
const SENSITIVE_KEYS = new Set([
  "commission",
  "cancellation_fee",
  "payout_threshold",
  "settlement_cutoff_hour",
]);

export function ConfigTab() {
  const { isSuperadmin } = useAdminRole();
  const config = useAppConfig();

  return (
    <section className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <h2 className="text-[13.5px] font-bold">Configuration de la plateforme</h2>
        <span className="ml-auto rounded-full bg-brand-50 px-3.5 py-1 text-[11.5px] font-bold text-brand-800">
          Modification réservée au superadmin
        </span>
      </div>
      <p className="border-b border-neutral-100 px-4 py-2.5 text-[11.5px] leading-relaxed text-neutral-500">
        Tout changement est historisé (app_config_history) et prend effet immédiatement sur les
        nouvelles courses — jamais sur les courses en cours. La commission s'édite depuis la page
        Finance (set_commission).
      </p>
      {config.isPending ? (
        <p className="px-4 py-8 text-center text-[12.5px] text-neutral-500">Chargement…</p>
      ) : config.isError ? (
        <p className="px-4 py-8 text-center text-[12.5px] font-semibold text-error">
          Lecture impossible. Vérifiez le réseau puis réessayez.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Clé", "Valeur", "Description", "Mise à jour", ""].map((header, index) => (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: en-têtes statiques
                    key={index}
                    className="bg-neutral-50 px-4 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-neutral-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.data.map((row) => (
                <ConfigRow key={row.key} row={row} canEdit={isSuperadmin} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ConfigRow({ row, canEdit }: { row: TableRow<"app_config">; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const sensitive = SENSITIVE_KEYS.has(row.key);
  const lockedToFinance = row.key === "commission";
  const disabled = !canEdit || lockedToFinance;

  return (
    <>
      <tr className="border-t border-neutral-100 align-top">
        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-semibold">
          {row.key}
          {sensitive ? (
            <span className="ml-2 rounded-full bg-warning-light px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-warning-dark">
              Sensible
            </span>
          ) : null}
        </td>
        <td className="px-4 py-2.5">
          <code className="block max-w-[280px] truncate rounded-[8px] bg-neutral-100 px-2 py-1 font-mono text-xs tabular-nums">
            {JSON.stringify(row.value)}
          </code>
        </td>
        <td className="px-4 py-2.5 text-neutral-500">{row.description ?? "—"}</td>
        <td className="whitespace-nowrap px-4 py-2.5 text-neutral-500">
          {formatDate(row.updated_at)}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-right">
          <button
            type="button"
            data-testid={`config-edit-${row.key}`}
            disabled={disabled}
            title={
              lockedToFinance
                ? "S'édite depuis la page Finance (set_commission)"
                : canEdit
                  ? undefined
                  : "Réservé au superadmin"
            }
            className="text-[11.5px] font-bold text-brand-800 disabled:text-neutral-300"
            onClick={() => setEditing((open) => !open)}
          >
            Modifier
          </button>
          {disabled ? (
            <span className="block text-[10px] text-neutral-400">
              {lockedToFinance ? "Via Finance" : "Réservé au superadmin"}
            </span>
          ) : null}
        </td>
      </tr>
      {editing ? <ConfigEditRow row={row} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

function ConfigEditRow({ row, onClose }: { row: TableRow<"app_config">; onClose: () => void }) {
  const [draft, setDraft] = useState(JSON.stringify(row.value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const mutation = useUpdateAppConfig();

  const save = () => {
    try {
      const value = JSON.parse(draft);
      setParseError(null);
      mutation.mutate({ key: row.key, value }, { onSuccess: onClose });
    } catch {
      setParseError("JSON invalide — corrigez la valeur avant d'enregistrer.");
    }
  };

  return (
    <tr className="bg-brand-50/40">
      <td colSpan={5} className="px-4 py-3">
        <label className="mb-1 block text-xs font-semibold" htmlFor={`config-value-${row.key}`}>
          Nouvelle valeur JSON pour « {row.key} »
        </label>
        <textarea
          id={`config-value-${row.key}`}
          data-testid={`config-value-${row.key}`}
          className="w-full rounded-[10px] border border-neutral-200 bg-neutral-0 p-2 font-mono text-xs outline-none"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {parseError ? <p className="mt-1 text-xs font-semibold text-error">{parseError}</p> : null}
        {mutation.isError ? (
          <p className="mt-1 text-xs font-semibold text-error">
            Modification refusée par le serveur (garde superadmin en base).
          </p>
        ) : null}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            data-testid={`config-save-${row.key}`}
            disabled={mutation.isPending}
            className="h-[32px] rounded-[14px] bg-brand-800 px-3.5 text-xs font-bold text-neutral-0 disabled:opacity-50"
            onClick={save}
          >
            Enregistrer
          </button>
          <button
            type="button"
            className="h-[32px] rounded-[14px] bg-neutral-100 px-3.5 text-xs font-bold text-neutral-700"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </td>
    </tr>
  );
}
