// Signal client pur : une modification de trajet vient d'être acceptée.
// L'écran de suivi, resté monté sous l'écran de modification, recharge alors
// la course (prix, destination), ses arrêts et son tracé.

import { create } from "zustand";

interface RouteChangeSignal {
  version: number;
  bump: () => void;
}

export const useRouteChangeSignal = create<RouteChangeSignal>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
