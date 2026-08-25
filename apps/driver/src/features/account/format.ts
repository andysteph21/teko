// Présentation du profil chauffeur (D-18) — helpers purs, testés sans rendu.
// Les numériques Postgres arrivent en CHAÎNES via supabase-js : Number()
// systématique avant tout formatage.

import type { TableRow, VehicleCategory } from "@teko/types";
import { accountFr } from "./strings";

/** Signature minimale de `t` (react-i18next) utilisée par les helpers. */
export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** « BM » pour « Boris Mba » — initiales des deux premiers mots. */
export function initials(fullName: string | null | undefined): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase());
  return letters.join("") || "•";
}

/** « +241 •• •• 45 12 » — seul les 4 derniers chiffres restent lisibles. */
export function maskMsisdn(msisdn: string | null | undefined): string {
  const digits = (msisdn ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "—";
  const last = digits.slice(-4);
  return `+241 •• •• ${last.slice(0, 2)} ${last.slice(2)}`;
}

/** « juin 2026 » à partir d'un timestamp ISO. */
export function memberSince(createdAt: string): string {
  const d = new Date(createdAt);
  return `${accountFr.calendrier.mois[d.getMonth()]} ${d.getFullYear()}`;
}

/** « Éco » ou « Éco + Moto » — libellés des catégories du chauffeur. */
export function categoriesLabel(categories: VehicleCategory[], t: TranslateFn): string {
  return categories.map((c) => t(`account:categorie.${c}`)).join(" + ");
}

/** « 4,8 » — note moyenne (chaîne Postgres possible). */
export function ratingText(ratingAvg: number | string): string {
  return Number(ratingAvg).toFixed(1).replace(".", ",");
}

/** Dernière pièce de chaque type (la liste arrive triée du plus récent au
 *  plus ancien) — D-08b remplace une pièce refusée par une nouvelle ligne. */
export function latestDocuments(
  documents: TableRow<"driver_documents">[],
): TableRow<"driver_documents">[] {
  const seen = new Set<string>();
  const latest: TableRow<"driver_documents">[] = [];
  for (const doc of documents) {
    if (seen.has(doc.type)) continue;
    seen.add(doc.type);
    latest.push(doc);
  }
  return latest;
}
