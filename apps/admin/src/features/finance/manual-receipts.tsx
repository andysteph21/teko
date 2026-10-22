"use client";

import { ManualReceiptForm } from "./manual-receipt-form";
import { ReceiptRow } from "./manual-receipt-row";
import { Panel, TH } from "./panel";
import { useManualReceipts } from "./use-manual-receipts";

export function ManualReceipts({
  userId,
  adminRole,
}: {
  userId: string;
  adminRole: string | null;
}) {
  const controls = useManualReceipts(userId);
  const rows = controls.data.data;
  const error =
    controls.data.error ??
    controls.prepare.error ??
    controls.approve.error ??
    controls.proof.error ??
    controls.reject.error;
  return (
    <Panel title="Règlements manuels et justificatifs">
      <p className="px-4 pt-3 text-xs text-neutral-500">
        Ops prépare le dossier. Finance ou le superadmin vérifie la preuve et valide ; le solde
        change après cette validation.
      </p>
      {error ? (
        <p role="alert" className="p-4 text-error-dark">
          L’opération a échoué. Le solde n’est confirmé qu’après validation serveur. Rechargez les
          dossiers avant de réessayer.
        </p>
      ) : null}
      {rows ? (
        <>
          <ManualReceiptForm
            drivers={rows.drivers}
            claims={rows.claims}
            payouts={rows.payouts}
            receipts={rows.receipts}
            busy={controls.prepare.isPending}
            onSubmit={(draft) => controls.prepare.mutate(draft)}
          />
          {controls.prepare.isSuccess ? (
            <p role="status" className="px-4 py-2">
              Dossier enregistré, en attente de validation Finance.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr>
                  {["Type", "Référence / chauffeur", "Montant", "Preuve privée", "Validation"].map(
                    (label) => (
                      <th key={label} className={TH}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.receipts.map((row) => (
                  <ReceiptRow
                    key={row.id}
                    row={row}
                    controls={controls}
                    canApprove={adminRole === "finance" || adminRole === "superadmin"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="p-4">Chargement des dossiers…</p>
      )}
    </Panel>
  );
}
