"use client";

// Fiche utilisateur (A-06, colonne droite) — détail chauffeur, suspension
// motivée et réactivation confirmée via setDriverActive (garde en base).

import type { PendingKycRow } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import type { TableRow } from "@teko/types";
import { useState } from "react";
import { formatDate, initials } from "./format-date";
import { KycPill, profileStatus, RolePill, StatusPill } from "./pills";
import { useSetDriverActive } from "./use-users";

interface UserDetailProps {
  profile: TableRow<"profiles">;
  driver: PendingKycRow | undefined;
}

export function UserDetail({ profile, driver }: UserDetailProps) {
  return (
    <div data-testid="user-detail">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3.5">
        <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-800">
          {initials(profile.full_name)}
        </span>
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-neutral-900">
            {profile.full_name ?? "—"}
            <RolePill role={profile.role} />
          </h3>
          <p className="font-mono text-xs tabular-nums text-neutral-500">{profile.phone ?? "—"}</p>
          <p className="text-xs text-neutral-500">Inscrit le {formatDate(profile.created_at)}</p>
        </div>
        <span className="ml-auto self-start">
          <StatusPill status={profileStatus(profile, driver)} />
        </span>
      </div>
      {profile.role === "driver" ? (
        driver ? (
          <DriverSection driver={driver} />
        ) : (
          <p className="px-4 py-3 text-xs leading-relaxed text-neutral-500">
            Fiche chauffeur indisponible — TODO backend : wrapper admin « listDrivers » manquant,
            l'index est reconstruit depuis la file KYC.
          </p>
        )
      ) : null}
    </div>
  );
}

function DriverSection({ driver }: { driver: PendingKycRow }) {
  const balance = Number(driver.current_balance_cache);
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <KycPill status={driver.kyc_status} />
        {driver.is_active ? null : (
          <span className="text-xs font-semibold text-error-dark">
            Suspendu{driver.deactivated_reason ? ` — ${driver.deactivated_reason}` : ""}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Stat label="Solde" value={formatXaf(balance)} negative={balance < 0} />
        <Stat label="Note" value={`★ ${Number(driver.rating_avg).toFixed(1)}`} />
      </div>
      <DriverActions driver={driver} />
      <p className="mt-3 text-[11.5px] leading-relaxed text-neutral-500">
        Toute action manuelle exige un motif et s'inscrit au journal d'audit avec votre identifiant.
      </p>
    </div>
  );
}

function Stat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex-1 rounded-[10px] bg-neutral-50 py-2 text-center">
      <p className={`font-mono text-sm font-black tabular-nums ${negative ? "text-error" : ""}`}>
        {value}
      </p>
      <span className="text-[9.5px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
    </div>
  );
}

function DriverActions({ driver }: { driver: PendingKycRow }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        data-testid="driver-toggle-active"
        className={`mt-3 h-[34px] rounded-[14px] px-3.5 text-xs font-bold ${
          driver.is_active ? "bg-error-light text-error-dark" : "bg-success-light text-success-dark"
        }`}
        onClick={() => setConfirming(true)}
      >
        {driver.is_active ? "Suspendre manuellement" : "Réactiver le chauffeur"}
      </button>
    );
  }
  return <ConfirmPanel driver={driver} onClose={() => setConfirming(false)} />;
}

function ConfirmPanel({ driver, onClose }: { driver: PendingKycRow; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const mutation = useSetDriverActive();
  const submit = () => {
    mutation.mutate(
      driver.is_active
        ? { driverId: driver.id, active: false, reason: reason.trim() }
        : { driverId: driver.id, active: true },
      { onSuccess: onClose },
    );
  };
  return (
    <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      {driver.is_active ? (
        <ReasonField reason={reason} onChange={setReason} />
      ) : (
        <p className="mb-2 text-xs text-neutral-700">Confirmer la réactivation du chauffeur ?</p>
      )}
      {mutation.isError ? (
        <p className="mb-2 text-xs font-semibold text-error">
          Action refusée par le serveur. Réessayez.
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="driver-toggle-confirm"
          disabled={(driver.is_active && reason.trim() === "") || mutation.isPending}
          className="h-[34px] rounded-[14px] bg-brand-800 px-3.5 text-xs font-bold text-neutral-0 disabled:opacity-50"
          onClick={submit}
        >
          Confirmer
        </button>
        <button
          type="button"
          data-testid="driver-toggle-cancel"
          className="h-[34px] rounded-[14px] bg-neutral-100 px-3.5 text-xs font-bold text-neutral-700"
          onClick={onClose}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function ReasonField({ reason, onChange }: { reason: string; onChange: (v: string) => void }) {
  return (
    <>
      <label className="mb-1 block text-xs font-semibold" htmlFor="suspend-reason">
        Motif de la suspension (obligatoire)
      </label>
      <textarea
        id="suspend-reason"
        data-testid="driver-suspend-reason"
        className="mb-2 w-full rounded-[10px] border border-neutral-200 bg-neutral-0 p-2 text-xs outline-none"
        rows={2}
        value={reason}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  );
}
