"use client";

// Clôture manuelle du jour (RPC daily_close) — double confirmation explicite,
// accessible aux rôles ops et superadmin (garde réelle en base).

import { useState } from "react";
import { apiErrorMessage } from "./labels";
import { useDailyClose } from "./use-finance";

export function DailyCloseButton({ adminRole }: { adminRole: string | null }) {
  const [armed, setArmed] = useState(false);
  const close = useDailyClose();
  const allowed = adminRole === "superadmin" || adminRole === "ops";

  if (close.isSuccess) {
    const n = close.data;
    return (
      <p data-testid="close-result" className="text-[12.5px] font-semibold text-success-dark">
        Clôture effectuée : {n} relevé{n > 1 ? "s" : ""} créé{n > 1 ? "s" : ""}.
      </p>
    );
  }
  if (armed) return <DailyCloseConfirm close={close} onCancel={() => setArmed(false)} />;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {allowed ? null : (
        <span className="text-xs text-neutral-500">Réservé aux rôles ops et superadmin</span>
      )}
      <button
        type="button"
        data-testid="close-run"
        disabled={!allowed}
        onClick={() => setArmed(true)}
        className="h-9 rounded-[10px] border border-warning-dark/30 bg-warning-light px-4 text-[13px] font-bold text-warning-dark disabled:opacity-40"
      >
        Lancer la clôture du jour
      </button>
    </div>
  );
}

function DailyCloseConfirm({
  close,
  onCancel,
}: {
  close: ReturnType<typeof useDailyClose>;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-warning-light px-3 py-2">
      <p className="text-[12.5px] font-bold text-warning-dark">Clôture 04 h 00 — irréversible.</p>
      {close.isError ? (
        <p className="text-[12.5px] font-semibold text-error-dark">
          {apiErrorMessage(close.error)}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="close-confirm"
        disabled={close.isPending}
        onClick={() => close.mutate()}
        className="h-8 rounded-lg bg-error px-3 text-xs font-bold text-neutral-0 disabled:opacity-50"
      >
        {close.isPending ? "Clôture en cours…" : "Confirmer la clôture"}
      </button>
      <button
        type="button"
        data-testid="close-cancel"
        onClick={onCancel}
        className="h-8 rounded-lg px-3 text-xs font-semibold text-neutral-600"
      >
        Annuler
      </button>
    </div>
  );
}
