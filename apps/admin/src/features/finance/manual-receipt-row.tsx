"use client";
import { formatXaf } from "@teko/core";
import type { TableRow } from "@teko/types";
import { useState } from "react";
import { TD } from "./panel";
import type { useManualReceipts } from "./use-manual-receipts";

const KIND = { settlement: "Règlement", cancellation_fee: "Frais encaissés", payout: "Versement" };
type Controls = ReturnType<typeof useManualReceipts>;
export function ReceiptRow({
  row,
  canApprove,
  controls,
}: {
  row: TableRow<"manual_receipts">;
  canApprove: boolean;
  controls: Controls;
}) {
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const viewProof = () => {
    setReviewed(false);
    controls.proof.mutate(row.proof_path, { onSuccess: setProof });
  };
  return (
    <tr>
      <td className={TD}>
        {KIND[row.kind as keyof typeof KIND]}
        <br />
        {row.method === "cash" ? "Espèces" : "Versement externe"}
      </td>
      <td className={TD}>
        {row.reference} · v{row.version}
        <br />
        <span className="font-mono text-xs">{row.driver_id.slice(0, 8)}</span>
      </td>
      <td className={TD}>{formatXaf(Number(row.amount))}</td>
      <td className={TD}>
        <button type="button" onClick={viewProof} className="underline">
          Consulter le justificatif
        </button>
        {proof ? (
          <>
            <a href={proof} target="_blank" rel="noreferrer" className="ml-2 underline">
              Ouvrir la preuve
            </a>
            {canApprove ? (
              <label className="mt-2 flex gap-2">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                J’ai vérifié la preuve et le montant réellement encaissé ou versé.
              </label>
            ) : null}
          </>
        ) : null}
      </td>
      <td className={TD}>
        {row.status === "approved" ? (
          "Validé par Finance"
        ) : row.status === "rejected" ? (
          <span>Refusé : {row.rejection_reason}</span>
        ) : (
          <>
            En attente
            {canApprove ? (
              <button
                type="button"
                disabled={!reviewed || controls.approve.isPending}
                onClick={() => controls.approve.mutate(row.id)}
                className="ml-2 rounded-lg bg-brand-600 p-2 text-neutral-0"
              >
                Valider l’encaissement ou le versement
              </button>
            ) : null}
            {canApprove ? (
              <div className="mt-2 flex flex-col gap-2">
                <label>
                  Motif du refus
                  <input
                    aria-label={`Motif du refus ${row.reference}`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={1000}
                    className="ml-2 rounded border p-1"
                  />
                </label>
                <button
                  type="button"
                  disabled={reason.trim().length < 3 || controls.reject.isPending}
                  onClick={() => controls.reject.mutate({ id: row.id, reason })}
                  className="underline"
                >
                  Refuser ce justificatif
                </button>
              </div>
            ) : null}
          </>
        )}
      </td>
    </tr>
  );
}
