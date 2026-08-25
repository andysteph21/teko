// État client de la journée de travail (Zustand 5) : présence en ligne
// (pilote le heartbeat) + toast éphémère (« solde mis à jour », « demande
// attribuée à un autre chauffeur »).

import { create } from "zustand";

interface WorkState {
  /** Toggle D-09 — la présence réelle expire côté backend (presence_ttl_s). */
  online: boolean;
  setOnline: (online: boolean) => void;
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useWorkStore = create<WorkState>((set) => ({
  online: false,
  setOnline: (online) => set({ online }),
  toast: null,
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
}));
