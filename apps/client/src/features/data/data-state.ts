// Sobriété data : compteur du mois (widget) + préférence de régime carte
// éco/auto/complet (C-25). Persistance kv-store branchée avec l'écran C-25 ;
// la résolution auto suit le réseau via NetInfo → resolveMapMode (pur).

import { type MapModePreference, type ResolvedMapMode, resolveMapMode } from "@teko/maps";
import { budgetState, DataUsageMeter, formatMo } from "@teko/telemetry";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { fetchNetworkHint } from "./network";

/** Compteur unique de l'app (rechargé/persisté par l'écran C-25 plus tard). */
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
