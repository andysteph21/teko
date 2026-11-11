// Repères & lieux enregistrés — recherche par nom (C-08), favoris D/T/★,
// propositions du compte (C-31). Les RPC géo (nearest/suggest/propose)
// vivent dans l'adaptateur de @teko/maps.

import { ewktPoint, type LonLat } from "@teko/maps";
import type { TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { unwrap } from "./errors";

/** Recherche de repères VALIDÉS — RPC search_landmarks : insensible aux
 *  accents et à la casse, nom ET alias (constat appareil réel : « Marche »
 *  doit trouver « Marché »). Avec `near`, les repères proches passent
 *  d'abord, par tranches de 2 km puis saillance ; sinon saillance seule. */
export async function searchLandmarksByName(
  client: TekoClient,
  query: string,
  options: { limit?: number; near?: LonLat | null } = {},
): Promise<TableRow<"landmarks">[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  return unwrap(
    await client.rpc("search_landmarks", {
      p_query: term,
      p_limit: options.limit ?? 8,
      ...(options.near ? { p_near: ewktPoint(options.near) } : {}),
    }),
  ) as TableRow<"landmarks">[];
}

/** Lieux enregistrés du compte (Domicile / Travail / favoris). */
export async function listSavedPlaces(client: TekoClient): Promise<TableRow<"saved_places">[]> {
  return unwrap(await client.from("saved_places").select("*").order("created_at"));
}

/** Propositions de repères du compte, tous statuts (C-31). */
export async function listMyLandmarkProposals(
  client: TekoClient,
): Promise<TableRow<"landmark_proposals">[]> {
  return unwrap(
    await client.from("landmark_proposals").select("*").order("created_at", { ascending: false }),
  );
}
