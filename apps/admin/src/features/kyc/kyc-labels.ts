// Libellés et petites règles pures du domaine KYC (A-03, AM-02/AM-03).
// Les 6 pièces requises viennent de docs/product/02-regles-metier.md §4.3 ;
// la photo de profil est demandée mais ne bloque pas la validation.

import { TekoApiError } from "@teko/api-client";
import type { DbEnum, TableRow } from "@teko/types";

export type KycStatus = DbEnum<"kyc_status">;
export type DocumentType = DbEnum<"document_type">;
export type DocumentRow = TableRow<"driver_documents">;

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  id_card: "Pièce d'identité",
  license: "Permis de conduire",
  registration: "Carte grise",
  insurance: "Assurance du véhicule",
  vehicle_photo: "Photo du véhicule",
  criminal_record: "Casier judiciaire",
  profile_photo: "Photo de profil",
};

/** Les 6 pièces qui conditionnent « Tout valider — activer le chauffeur ». */
export const REQUIRED_DOC_TYPES: DocumentType[] = [
  "id_card",
  "license",
  "registration",
  "insurance",
  "vehicle_photo",
  "criminal_record",
];

export const CATEGORY_LABELS: Record<DbEnum<"vehicle_category">, string> = {
  eco: "Éco",
  moto: "Moto-taxi",
  confort: "Confort",
  covoiturage: "Covoiturage",
};

export const KYC_TABS: { status: KycStatus; label: string; empty: string }[] = [
  { status: "pending", label: "En attente", empty: "Aucun dossier en attente" },
  { status: "rejected", label: "À corriger", empty: "Aucun dossier à corriger" },
  { status: "validated", label: "Validés", empty: "Aucun dossier validé" },
];

export const DOC_STATUS_PILL: Record<KycStatus, { label: string; className: string }> = {
  pending: { label: "À examiner", className: "bg-warning-light text-warning-dark" },
  validated: { label: "Conforme", className: "bg-success-light text-success-dark" },
  rejected: { label: "Refusée", className: "bg-error-light text-error-dark" },
};

/** « il y a 4 h » / « il y a 2 j » — heures jusqu'à l'engagement 48 h. */
export function relativeFr(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

/** Dossier proche de l'engagement 48 h (pastille rouge, bandeau SLA). */
export function isNearSla(iso: string, now = Date.now()): boolean {
  return now - new Date(iso).getTime() >= 24 * 3_600_000;
}

export function initials(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => (part[0] ?? "").toUpperCase())
    .join("");
}

/** Dernière pièce déposée par type (les listes arrivent triées desc). */
export function latestDocByType(docs: DocumentRow[]): Map<DocumentType, DocumentRow> {
  const map = new Map<DocumentType, DocumentRow>();
  for (const doc of docs) {
    if (!map.has(doc.type)) map.set(doc.type, doc);
  }
  return map;
}

/** Pièces requises encore manquantes ou non conformes (bloquent le dossier). */
export function pendingRequiredTypes(docs: DocumentRow[]): DocumentType[] {
  const latest = latestDocByType(docs);
  return REQUIRED_DOC_TYPES.filter((type) => latest.get(type)?.status !== "validated");
}

export function fileName(storagePath: string): string {
  return storagePath.split("/").at(-1) ?? storagePath;
}

/** Message français stable à partir du code TekoApiError (jamais de string-match). */
export function frenchApiError(caught: unknown): string {
  if (caught instanceof TekoApiError) {
    if (caught.code === "network") return "Connexion impossible. Vérifiez le réseau.";
    if (caught.code === "not_authorized") return "Action non autorisée pour votre rôle.";
  }
  return "Une erreur est survenue. Réessayez.";
}
