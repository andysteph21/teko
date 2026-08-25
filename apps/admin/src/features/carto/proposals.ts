// Modération cartographique (A-04) — logique pure : fusion des files de
// propositions (repères + routes), géométries Supabase → LonLat, libellés FR.

import { TekoApiError } from "@teko/api-client";
import { type LonLat, toLonLat } from "@teko/maps";
import type { DbEnum, TableRow } from "@teko/types";

export type LandmarkProposalRow = TableRow<"landmark_proposals">;
export type RoadProposalRow = TableRow<"road_proposals">;

export interface ModerationItem {
  kind: "landmark" | "road";
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  /** Points du tracé (un seul pour un repère) — vide si géométrie illisible. */
  points: LonLat[];
  /** Catégorie brute (repères) — sert à la lettre de l'épingle carte. */
  category: string | null;
  /** Nombre de traces GPS (routes) — affiché le long du tracé proposé. */
  supportCount?: number;
  photoUrl: string | null;
}

export const CATEGORY_LABELS: Record<DbEnum<"landmark_category">, string> = {
  fuel_station: "Station-service",
  roundabout: "Rond-point",
  market: "Marché",
  church: "Église",
  school: "École",
  pharmacy: "Pharmacie",
  bar: "Bar",
  building: "Immeuble",
  junction: "Carrefour",
  other: "Autre",
};

/** Libellé FR d'une catégorie (tolère une valeur inconnue du type généré). */
export function categoryLabel(category: string | null): string {
  if (!category) return "";
  return (CATEGORY_LABELS as Record<string, string>)[category] ?? category;
}

const ROLE_LABELS: Record<string, string> = {
  client: "un client",
  driver: "un chauffeur",
  admin: "l'équipe Teko",
};

/** Point d'un repère — GeoJSON (PostgREST/Realtime) ou EWKB hexadécimal. */
export function landmarkPoint(geom: unknown): LonLat | null {
  try {
    return toLonLat(geom as Parameters<typeof toLonLat>[0]);
  } catch {
    return null;
  }
}

/** Tracé d'une route proposée. PostgREST sérialise en GeoJSON LineString ;
 *  l'EWKB hex LineString n'est pas décodé (parseEwkbPoint = Points seuls). */
export function roadPath(geom: unknown): LonLat[] {
  if (!geom || typeof geom !== "object") return [];
  const line = geom as { type?: string; coordinates?: unknown };
  if (line.type !== "LineString" || !Array.isArray(line.coordinates)) return [];
  const points: LonLat[] = [];
  for (const pair of line.coordinates) {
    if (Array.isArray(pair) && typeof pair[0] === "number" && typeof pair[1] === "number") {
      points.push({ lon: pair[0], lat: pair[1] });
    }
  }
  return points;
}

export function landmarkItem(row: LandmarkProposalRow): ModerationItem {
  // TODO joindre le profil du proposant (nom) — la table n'expose que le rôle.
  const parts = [
    `Proposé par ${ROLE_LABELS[row.role ?? ""] ?? "un utilisateur"}`,
    row.photo_url ? "photo jointe" : "sans photo",
    `catégorie ${CATEGORY_LABELS[row.category]}`,
  ];
  if (row.aliases.length > 0) parts.push(`alias : ${row.aliases.join(", ")}`);
  const point = landmarkPoint(row.geom);
  return {
    kind: "landmark",
    id: row.id,
    title: row.name,
    detail: `${parts.join(" · ")}.`,
    createdAt: row.created_at,
    points: point ? [point] : [],
    category: row.category,
    photoUrl: row.photo_url,
  };
}

export function roadItem(row: RoadProposalRow): ModerationItem {
  return {
    kind: "road",
    id: row.id,
    title: "Route détectée",
    detail: `Détectée depuis ${row.support_count} traces GPS anonymisées (${row.distinct_drivers} chauffeurs distincts).`,
    createdAt: row.created_at,
    points: roadPath(row.geom),
    category: null,
    supportCount: row.support_count,
    photoUrl: null,
  };
}

/** File unifiée, plus ancien d'abord (ordre de traitement). */
export function buildQueue(
  landmarks: LandmarkProposalRow[],
  roads: RoadProposalRow[],
): ModerationItem[] {
  return [...landmarks.map(landmarkItem), ...roads.map(roadItem)].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

function makeDateFormat(): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("fr-GA", DATE_OPTIONS);
  } catch {
    return new Intl.DateTimeFormat("fr", DATE_OPTIONS);
  }
}

const dateFormat = makeDateFormat();

export function formatProposalDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Message d'erreur FR sur code stable — jamais de string-match (doc 10 §3). */
export function reviewErrorMessage(error: unknown): string {
  if (error instanceof TekoApiError) {
    if (error.code === "network") return "Connexion impossible. Vérifiez le réseau.";
    if (error.code === "not_authorized") return "Action réservée aux administrateurs.";
    // Les messages backend sont déjà des phrases françaises humaines.
    if (error.message) return error.message;
  }
  return "L'action a échoué. Réessayez.";
}
