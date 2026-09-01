// État client de la journée de travail (Zustand 5) : présence en ligne
// (pilote le heartbeat), position appareil (point véhicule), problème de
// localisation (bandeau D-09) + toast éphémère (« solde mis à jour »,
// « demande attribuée à un autre chauffeur »).

import type { LonLat } from "@teko/maps";
import { create } from "zustand";

/** Position manquante : refus, refus définitif (réglages), ou GPS muet. */
export type LocationIssue = "denied" | "blocked" | "lost";

interface WorkState {
  /** Toggle D-09 — la présence réelle expire côté backend (presence_ttl_s). */
  online: boolean;
  setOnline: (online: boolean) => void;
  /** null quand la position arrive normalement — sinon bandeau D-09. */
  locationIssue: LocationIssue | null;
  setLocationIssue: (issue: LocationIssue | null) => void;
  /** Dernière position lue (montage, battement, envoi en course). */
  devicePosition: LonLat | null;
  setDevicePosition: (position: LonLat) => void;
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useWorkStore = create<WorkState>((set) => ({
  online: false,
  setOnline: (online) => set({ online }),
  locationIssue: null,
  setLocationIssue: (locationIssue) => set({ locationIssue }),
  devicePosition: null,
  setDevicePosition: (devicePosition) => set({ devicePosition }),
  toast: null,
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
}));
