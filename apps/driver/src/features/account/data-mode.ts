// Sobriété data côté chauffeur (D-19, patron C-25 client) : compteur du
// mois (@teko/telemetry) + préférence de régime carte éco/auto/complet dans
// un petit store zustand local à l'app ; la résolution auto suit le réseau
// via NetInfo → resolveMapMode (pur, @teko/maps).

import NetInfo from "@react-native-community/netinfo";
import {
  type MapModePreference,
  type NetworkHint,
  type ResolvedMapMode,
  resolveMapMode,
} from "@teko/maps";
import { budgetState, DataUsageMeter, formatMo } from "@teko/telemetry";
import { useEffect, useState } from "react";
import { create } from "zustand";

/** Compteur data unique de l'app chauffeur. */
export const dataMeter = new DataUsageMeter();

export function useDataUsage(): { quantityText: string; state: "normal" | "alerte" | "critique" } {
  const [total, setTotal] = useState(dataMeter.totalBytes);
  useEffect(() => dataMeter.subscribe(setTotal), []);
  return { quantityText: formatMo(total), state: budgetState(total) };
}

interface MapModeState {
  preference: MapModePreference;
  setPreference: (preference: MapModePreference) => void;
}

export const useMapModeStore = create<MapModeState>((set) => ({
  preference: "auto",
  setPreference: (preference) => set({ preference }),
}));

/** NetInfo (RN) traduit vers le NetworkHint pur de @teko/maps. */
export async function fetchNetworkHint(): Promise<NetworkHint> {
  const state = await NetInfo.fetch();
  if (state.type === "cellular") {
    const generation = state.details.cellularGeneration;
    if (generation === "2g") return { effectiveType: "2g" };
    if (generation === "3g") return { effectiveType: "3g" };
    return { effectiveType: "4g" };
  }
  return {};
}

/** Régime carte résolu (préférence × réseau) — à réévaluer à l'affichage. */
export function useResolvedMapMode(): ResolvedMapMode {
  const preference = useMapModeStore((s) => s.preference);
  const [resolved, setResolved] = useState<ResolvedMapMode>(() => resolveMapMode(preference, {}));
  useEffect(() => {
    let cancelled = false;
    void fetchNetworkHint().then((hint) => {
      if (!cancelled) setResolved(resolveMapMode(preference, hint));
    });
    return () => {
      cancelled = true;
    };
  }, [preference]);
  return resolved;
}
