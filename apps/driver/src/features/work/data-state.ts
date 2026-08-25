// Sobriété data côté chauffeur : compteur du mois (widget) + régime carte
// éco/auto/complet résolu depuis le réseau (même logique que l'app client).
// La préférence persistée arrive avec l'écran D-19 (paramètres).

import NetInfo from "@react-native-community/netinfo";
import {
  type MapModePreference,
  type NetworkHint,
  type ResolvedMapMode,
  resolveMapMode,
} from "@teko/maps";
import { budgetState, DataUsageMeter, formatMo } from "@teko/telemetry";
import { useEffect, useState } from "react";

/** Compteur unique de l'app (persistance branchée avec D-19 plus tard). */
export const dataMeter = new DataUsageMeter();

export function useDataUsage(): { quantityText: string; state: "normal" | "alerte" | "critique" } {
  const [total, setTotal] = useState(dataMeter.totalBytes);
  useEffect(() => dataMeter.subscribe(setTotal), []);
  return { quantityText: formatMo(total), state: budgetState(total) };
}

/** NetInfo (RN) → NetworkHint pur de @teko/maps. */
async function fetchNetworkHint(): Promise<NetworkHint> {
  const state = await NetInfo.fetch();
  if (state.type === "cellular") {
    const generation = state.details.cellularGeneration;
    if (generation === "2g") return { effectiveType: "2g" };
    if (generation === "3g") return { effectiveType: "3g" };
    return { effectiveType: "4g" };
  }
  return {};
}

/** Régime carte résolu — préférence « auto » tant que D-19 n'existe pas. */
export function useResolvedMapMode(preference: MapModePreference = "auto"): ResolvedMapMode {
  const [resolved, setResolved] = useState<ResolvedMapMode>(() => resolveMapMode(preference, {}));
  useEffect(() => {
    let cancelled = false;
    fetchNetworkHint()
      .then((hint) => {
        if (!cancelled) setResolved(resolveMapMode(preference, hint));
      })
      .catch(() => {
        // Indice réseau indisponible : on reste sur la résolution par défaut.
      });
    return () => {
      cancelled = true;
    };
  }, [preference]);
  return resolved;
}
