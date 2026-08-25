// Pastilles de rôle et de statut — reprise des styles des maquettes A-06/A-08.

import type { PendingKycRow } from "@teko/api-client";
import type { TableRow } from "@teko/types";

const ROLE_STYLES: Record<string, { label: string; cls: string }> = {
  client: { label: "Client", cls: "bg-client-accent/10 text-client-accent" },
  driver: { label: "Chauffeur", cls: "bg-driver-accent-light text-driver-accent-dark" },
  admin: { label: "Admin", cls: "bg-brand-900 text-neutral-0" },
};

export function RolePill({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? { label: role, cls: "bg-neutral-100 text-neutral-500" };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${style.cls}`}
    >
      {style.label}
    </span>
  );
}

export interface ProfileStatus {
  label: string;
  cls: string;
}

/** Statut affiché d'un profil, enrichi de la fiche chauffeur si connue. */
export function profileStatus(
  profile: TableRow<"profiles">,
  driver: PendingKycRow | undefined,
): ProfileStatus {
  if (profile.deleted_at) return { label: "Supprimé", cls: "bg-neutral-100 text-neutral-500" };
  if (profile.deletion_requested_at) {
    return { label: "Suppression demandée", cls: "bg-warning-light text-warning-dark" };
  }
  if (driver && !driver.is_active)
    return { label: "Suspendu", cls: "bg-error-light text-error-dark" };
  return { label: "Actif", cls: "bg-success-light text-success-dark" };
}

export function StatusPill({ status }: { status: ProfileStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${status.cls}`}
    >
      {status.label}
    </span>
  );
}

const KYC_STYLES: Record<string, ProfileStatus> = {
  pending: { label: "KYC en attente", cls: "bg-warning-light text-warning-dark" },
  validated: { label: "KYC validé", cls: "bg-success-light text-success-dark" },
  rejected: { label: "KYC refusé", cls: "bg-error-light text-error-dark" },
};

export function KycPill({ status }: { status: string }) {
  const style = KYC_STYLES[status] ?? { label: status, cls: "bg-neutral-100 text-neutral-500" };
  return <StatusPill status={style} />;
}
