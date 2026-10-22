"use client";

import { formatXaf } from "@teko/core";
import type { TableRow } from "@teko/types";
import { type FormEvent, useState } from "react";
import type { ReceiptDraft } from "./use-manual-receipts";

interface Props {
  drivers: TableRow<"profiles">[];
  claims: TableRow<"cancellation_claims">[];
  payouts: TableRow<"payout_requests">[];
  receipts?: TableRow<"manual_receipts">[];
  busy: boolean;
  onSubmit: (draft: ReceiptDraft) => void;
}
const INPUT = "rounded-lg border border-neutral-200 bg-neutral-0 p-2 text-sm";

function ReceiptFields({ drivers }: Pick<Props, "drivers">) {
  return (
    <>
      <label className="flex flex-col gap-1">
        Chauffeur
        <select name="driverId" required className={INPUT}>
          <option value="">Choisir un chauffeur</option>
          {drivers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.full_name ?? row.phone ?? row.id}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Montant encaissé (FCFA)
        <input name="amount" type="number" min="25" step="25" required className={INPUT} />
      </label>
    </>
  );
}

function ProofFields({ revision }: { revision: boolean }) {
  return (
    <>
      <label className="flex flex-col gap-1">
        Moyen
        <select name="method" className={INPUT}>
          <option value="cash">Espèces</option>
          <option value="external_transfer">Versement externe</option>
        </select>
      </label>
      {!revision ? (
        <label className="flex flex-col gap-1">
          Référence du reçu ou de la transaction
          <input name="reference" minLength={3} maxLength={160} required className={INPUT} />
        </label>
      ) : null}
      <label className="flex flex-col gap-1">
        Justificatif (photo ou PDF, 10 Mo maximum)
        <input
          name="proof"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          required
          className={INPUT}
        />
      </label>
    </>
  );
}

function readReceiptDraft(element: HTMLFormElement, source: string): ReceiptDraft {
  const form = new FormData(element);
  const amount = Number(form.get("amount"));
  if (
    (source === "settlement" || source.startsWith("revision:")) &&
    (!Number.isFinite(amount) || amount <= 0 || amount % 25 !== 0)
  ) {
    throw new Error(
      "Le montant doit être positif et multiple de 25 FCFA, sans arrondir le justificatif.",
    );
  }
  const file = form.get("proof") as File;
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new Error("Choisissez un justificatif de moins de 10 Mo.");
  return {
    source,
    driverId: String(form.get("driverId") ?? ""),
    amount,
    method: form.get("method") as ReceiptDraft["method"],
    reference: String(form.get("reference")),
    file,
  };
}

export function ManualReceiptForm(props: Props) {
  const [source, setSource] = useState("settlement");
  const [error, setError] = useState<string | null>(null);
  const name = (id: string) => props.drivers.find((row) => row.id === id)?.full_name ?? "Chauffeur";
  const revision = props.receipts?.find((row) => source === `revision:${row.id}`);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      props.onSubmit(readReceiptDraft(event.currentTarget, source));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Dossier invalide.");
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 p-4 text-sm sm:grid-cols-2">
      <label className="flex flex-col gap-1 sm:col-span-2">
        Opération
        <select
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className={INPUT}
        >
          <option value="settlement">Encaissement d’un règlement chauffeur</option>
          {props.receipts
            ?.filter(
              (row) =>
                row.status === "rejected" &&
                !props.receipts?.some((child) => child.previous_receipt_id === row.id),
            )
            .map((row) => (
              <option key={row.id} value={`revision:${row.id}`}>
                Réviser {row.reference} · version {row.version + 1}
              </option>
            ))}
          {props.claims.map((row) => (
            <option key={row.id} value={`claim:${row.id}`}>
              Frais · {name(row.driver_id)} · {formatXaf(Number(row.amount))} · course{" "}
              {row.ride_id.slice(0, 8)}
            </option>
          ))}
          {props.payouts
            .filter((row) => !row.receipt_id)
            .map((row) => (
              <option key={row.id} value={`payout:${row.id}`}>
                Versement · {name(row.driver_id)} · {formatXaf(Number(row.amount))} ·{" "}
                {row.business_day}
              </option>
            ))}
        </select>
      </label>
      {source === "settlement" ? <ReceiptFields drivers={props.drivers} /> : null}
      {revision ? (
        <>
          <p>
            Référence conservée : {revision.reference}. Motif : {revision.rejection_reason}
          </p>
          <label>
            Montant corrigé (FCFA)
            <input
              key={revision.id}
              name="amount"
              type="number"
              min="25"
              step="25"
              defaultValue={Number(revision.amount)}
              required
              className={INPUT}
            />
          </label>
        </>
      ) : null}
      <p className="text-neutral-600 sm:col-span-2">
        Montants au multiple de 25 FCFA. Recopiez le montant exact du justificatif, sans arrondi.
      </p>
      <ProofFields revision={Boolean(revision)} />
      {error ? <p role="alert">{error}</p> : null}
      <button
        disabled={props.busy}
        className="rounded-lg bg-brand-600 p-2 font-bold text-neutral-0"
        type="submit"
      >
        {props.busy ? "Enregistrement…" : "Préparer pour validation Finance"}
      </button>
    </form>
  );
}
