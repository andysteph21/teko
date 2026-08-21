// Choix du régime carte : préférence utilisateur × état du réseau.
// C-25 : « Automatique sous 2G — s'active seul quand le réseau est lent ».
// Pur et sans dépendance : la détection réseau vit côté plateforme
// (web/network.ts pour le navigateur, NetInfo côté React Native).

export type MapModePreference = "eco" | "auto" | "complet";
export type MapMode = "eco" | "complet";

export interface NetworkHint {
  /** navigator.connection.effectiveType : "slow-2g" | "2g" | "3g" | "4g". */
  effectiveType?: string;
  /** L'utilisateur a activé l'économiseur de données du système. */
  saveData?: boolean;
}

export interface ResolvedMapMode {
  mode: MapMode;
  /** Pourquoi — affichable tel quel dans l'UI. */
  raison: string;
}

const RESEAUX_LENTS = new Set(["slow-2g", "2g"]);

export function resolveMapMode(
  pref: MapModePreference,
  reseau: NetworkHint = {},
): ResolvedMapMode {
  if (pref === "eco") return { mode: "eco", raison: "choix : éco" };
  if (pref === "complet") return { mode: "complet", raison: "choix : complet" };
  if (reseau.saveData) {
    return { mode: "eco", raison: "auto : économiseur de données du téléphone" };
  }
  if (reseau.effectiveType && RESEAUX_LENTS.has(reseau.effectiveType)) {
    return { mode: "eco", raison: `auto : réseau lent (${reseau.effectiveType})` };
  }
  return { mode: "complet", raison: "auto : réseau correct" };
}
