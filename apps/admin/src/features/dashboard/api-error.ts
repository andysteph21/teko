// Erreurs API → message français stable (jamais de string-match, doc 10 §3).

import { TekoApiError } from "@teko/api-client";

export function apiErrorText(error: unknown): string {
  if (error instanceof TekoApiError) {
    if (error.code === "network") return "Connexion impossible. Vérifiez le réseau.";
    if (error.code === "not_authorized" || error.code === "superadmin_only") {
      return "Action non autorisée.";
    }
  }
  return "Une erreur est survenue. Réessayez.";
}
