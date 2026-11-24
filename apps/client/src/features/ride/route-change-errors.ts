// Codes d'erreur stables → clés i18n du parcours « Modifier le trajet » (R3).
// Jamais de lecture du message serveur : seul TekoApiError.code décide.

import { TekoApiError, type TekoApiErrorCode } from "@teko/api-client";

const BASE = "ride:modification.erreurs";

const KEYS: Partial<Record<TekoApiErrorCode, string>> = {
  network: "erreurs.reseau",
  service_closed: `${BASE}.service_closed`,
  route_too_many_stops: `${BASE}.route_too_many_stops`,
  route_too_many_changes: `${BASE}.route_too_many_changes`,
  route_not_editable: `${BASE}.route_not_editable`,
  route_change_handled: `${BASE}.route_change_handled`,
  seats_full: `${BASE}.seats_full`,
  fees_due: `${BASE}.fees_due`,
  quote_route_not_found: `${BASE}.quote_route_not_found`,
  quote_points_too_close: `${BASE}.quote_points_too_close`,
  quote_expired: `${BASE}.quote_expired`,
};

/** Clé i18n du message à afficher pour une erreur de modification de trajet. */
export function routeChangeErrorKey(error: unknown): string {
  const code = error instanceof TekoApiError ? error.code : "unknown";
  return KEYS[code] ?? "erreurs.generique";
}
