"use client";

// Bandeau commission (A-05) : lecture get_commission, modification réservée
// au superadmin (set_commission) avec confirmation explicite avant envoi.

import { formatXaf } from "@teko/core";
import { useState } from "react";
import { apiErrorMessage } from "./labels";
import { type CommissionValue, useCommission, useSetCommission } from "./use-finance";

export function commissionLabel(commission: CommissionValue): string {
  return commission.type === "fixed"
    ? `${formatXaf(commission.value)} par course`
    : `${commission.value} % par course`;
}

function commissionDisplay(commission: ReturnType<typeof useCommission>): string {
  if (commission.data) return commissionLabel(commission.data);
  return commission.isPending ? "…" : "—";
}

export function CommissionBanner({ adminRole }: { adminRole: string | null }) {
  const commission = useCommission();
  const [editing, setEditing] = useState(false);
  const isSuperadmin = adminRole === "superadmin";

  return (
    <section className="h-full rounded-[14px] border border-neutral-200 bg-neutral-0 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">
            Commission actuelle
          </p>
          <p
            className="font-mono text-xl font-black tabular-nums text-neutral-900"
            data-testid="commission-value"
          >
            {commissionDisplay(commission)}
          </p>
        </div>
        {editing ? null : (
          <div className="ml-auto flex items-center gap-2.5">
            {isSuperadmin ? null : (
              <span className="text-xs text-neutral-500">Réservé au superadmin</span>
            )}
            <button
              type="button"
              data-testid="commission-edit"
              disabled={!isSuperadmin}
              onClick={() => setEditing(true)}
              className="h-9 rounded-[10px] bg-brand-800 px-4 text-[13px] font-semibold text-neutral-0 disabled:opacity-40"
            >
              Modifier
            </button>
          </div>
        )}
      </div>
      {editing && commission.data ? (
        <CommissionEditor initial={commission.data} onClose={() => setEditing(false)} />
      ) : null}
    </section>
  );
}

function CommissionEditor({ initial, onClose }: { initial: CommissionValue; onClose: () => void }) {
  const [type, setType] = useState<"percent" | "fixed">(
    initial.type === "fixed" ? "fixed" : "percent",
  );
  const [raw, setRaw] = useState(String(initial.value));
  const [confirming, setConfirming] = useState(false);
  const save = useSetCommission();
  const value = Number(raw);
  const valid =
    raw.trim() !== "" &&
    Number.isFinite(value) &&
    value >= 0 &&
    (type !== "percent" || value <= 100);

  if (confirming) {
    return (
      <CommissionConfirm
        next={{ type, value }}
        save={save}
        onBack={() => setConfirming(false)}
        onDone={onClose}
      />
    );
  }
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2.5 border-t border-neutral-100 pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) setConfirming(true);
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
        Type
        <select
          data-testid="commission-type"
          value={type}
          onChange={(event) => setType(event.target.value === "fixed" ? "fixed" : "percent")}
          className="h-9 rounded-lg border border-neutral-200 bg-neutral-0 px-2 text-[13px] text-neutral-800"
        >
          <option value="percent">Pourcentage (%)</option>
          <option value="fixed">Montant fixe (F par course)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-neutral-600">
        Valeur
        <input
          data-testid="commission-input"
          inputMode="decimal"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="h-9 w-24 rounded-lg border border-neutral-200 bg-neutral-0 px-2 font-mono text-[13px] tabular-nums"
        />
      </label>
      <button
        type="submit"
        data-testid="commission-continue"
        disabled={!valid}
        className="h-9 rounded-[10px] bg-brand-800 px-4 text-[13px] font-semibold text-neutral-0 disabled:opacity-40"
      >
        Continuer
      </button>
      <button
        type="button"
        data-testid="commission-cancel"
        onClick={onClose}
        className="h-9 rounded-[10px] px-3 text-[13px] font-semibold text-neutral-500"
      >
        Annuler
      </button>
    </form>
  );
}

function CommissionConfirm({
  next,
  save,
  onBack,
  onDone,
}: {
  next: { type: "percent" | "fixed"; value: number };
  save: ReturnType<typeof useSetCommission>;
  onBack: () => void;
  onDone: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-neutral-100 pt-3">
      <p className="text-[12.5px] text-neutral-700">
        Nouvelle commission : <strong>{commissionLabel(next)}</strong> — s'applique aux prochaines
        courses.
      </p>
      {save.isError ? (
        <p className="text-[12.5px] font-semibold text-error-dark">{apiErrorMessage(save.error)}</p>
      ) : null}
      <button
        type="button"
        data-testid="commission-confirm"
        disabled={save.isPending}
        onClick={() => save.mutate(next, { onSuccess: onDone })}
        className="h-9 rounded-[10px] bg-brand-800 px-4 text-[13px] font-semibold text-neutral-0 disabled:opacity-50"
      >
        {save.isPending ? "Application…" : "Confirmer"}
      </button>
      <button
        type="button"
        data-testid="commission-back"
        onClick={onBack}
        className="h-9 rounded-[10px] px-3 text-[13px] font-semibold text-neutral-500"
      >
        Retour
      </button>
    </div>
  );
}
