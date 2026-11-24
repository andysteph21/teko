// Modification de trajet demandée par le passager (lot R3) : le chauffeur a
// 30 secondes (respond_by, source serveur) pour accepter ou refuser ; sans
// réponse, la course continue inchangée.

import type { RouteChange } from "@teko/api-client";

/** Cadence de lecture de la dernière modification pendant une course. */
export const ROUTE_CHANGE_POLL_MS = 3_000;

/** La demande attend encore la réponse du chauffeur. */
export function isPendingChange(change: RouteChange | null, now = Date.now()): boolean {
  if (change?.status !== "pending" || !change.respond_by) return false;
  return Date.parse(change.respond_by) > now;
}

/** Arrêts restants demandés (JSON serveur : tableau dans l'ordre). */
export function changeStopsCount(change: Pick<RouteChange, "stops">): number {
  return Array.isArray(change.stops) ? change.stops.length : 0;
}

/** Même ligne, même état : évite un rendu à chaque lecture périodique. */
export function sameChange(a: RouteChange | null, b: RouteChange | null): boolean {
  return a?.id === b?.id && a?.status === b?.status;
}
