// Les 6 pièces du dossier chauffeur (D-05/D-08) — ordre d'affichage figé,
// genre grammatical pour les accords (« Ajouté » / « Ajoutée »).

import type { DbEnum, TableRow } from "@teko/types";

export type KycDocType = Exclude<DbEnum<"document_type">, "profile_photo">;

export interface KycDocMeta {
  type: KycDocType;
  /** Accord des libellés d'état (Validée, refusée…). */
  feminine: boolean;
}

export const KYC_DOC_TYPES: readonly KycDocMeta[] = [
  { type: "license", feminine: false },
  { type: "id_card", feminine: true },
  { type: "registration", feminine: true },
  { type: "insurance", feminine: true },
  { type: "vehicle_photo", feminine: true },
  { type: "criminal_record", feminine: false },
] as const;

export type DocumentRowData = TableRow<"driver_documents">;

/** Dernière pièce téléversée par type (la liste arrive triée du plus récent
 *  au plus ancien — la première occurrence gagne). */
export function latestByType(
  documents: readonly DocumentRowData[],
): Partial<Record<KycDocType, DocumentRowData>> {
  const map: Partial<Record<KycDocType, DocumentRowData>> = {};
  for (const doc of documents) {
    const type = doc.type as KycDocType;
    if (!map[type]) map[type] = doc;
  }
  return map;
}
