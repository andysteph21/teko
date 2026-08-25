// Libellés français des enums finance (statement_status, payment_kind,
// payment_status) + aides d'affichage partagées par les tables.

import { TekoApiError } from "@teko/api-client";
import type { DbEnum, Json, TableRow } from "@teko/types";
import type { Chip } from "./status-chip";

export const STATEMENT_STATUS: Record<DbEnum<"statement_status">, Chip> = {
  open: { label: "En cours", className: "bg-info-light text-info" },
  settled: { label: "Réglée", className: "bg-success-light text-success-dark" },
  overdue: { label: "En retard", className: "bg-error-light text-error-dark" },
  paid_out: { label: "Versée", className: "bg-neutral-100 text-neutral-600" },
};

export const PAYMENT_STATUS: Record<DbEnum<"payment_status">, Chip> = {
  initiated: { label: "Initié", className: "bg-neutral-100 text-neutral-600" },
  pending: { label: "En attente", className: "bg-warning-light text-warning-dark" },
  success: { label: "Confirmé", className: "bg-success-light text-success-dark" },
  failed: { label: "Échoué", className: "bg-error-light text-error-dark" },
  ambiguous: { label: "Ambigu", className: "bg-warning-light text-warning-dark" },
};

/** Valeurs réelles de `payment_kind` (packages/types), pas celles du brief. */
export const PAYMENT_KIND_LABELS: Record<DbEnum<"payment_kind">, string> = {
  ride_collection: "Course Airtel",
  driver_settlement: "Règlement",
  payout: "Versement",
  cancellation_fee: "Frais d'annulation",
  refund: "Remboursement",
};

/** Montant signé : `direction = out` (versements, remboursements) en négatif. */
export function signedAmount(payment: TableRow<"payments">): number {
  const amount = Number(payment.amount);
  return payment.direction === "out" ? -amount : amount;
}

/** Pas de colonne d'erreur dédiée sur `payments` : on lit le payload `raw`. */
export function paymentErrorCode(raw: Json): string | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  for (const key of ["error_code", "code", "reason"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/** TekoApiError.code → message français (jamais de string-match, doc 10 §3). */
export function apiErrorMessage(caught: unknown): string {
  if (caught instanceof TekoApiError) {
    if (caught.code === "superadmin_only") return "Action réservée au superadmin.";
    if (caught.code === "not_authorized") return "Action non autorisée pour votre rôle.";
    if (caught.code === "network") return "Connexion impossible. Vérifiez le réseau.";
  }
  return "Une erreur est survenue. Réessayez.";
}
