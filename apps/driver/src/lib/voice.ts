// Annonces vocales du chauffeur (option C, décision du porteur du
// 17 novembre 2026) : la synthèse du téléphone lit les moments clés de la
// course, dont le repère du passager. Aucun guidage virage par virage.
//
// Une voix française est exigée : sans elle, Android lit le texte avec la
// voix de la langue du téléphone (constat OPPO A15 réglé en anglais, voix
// en-US seule installée). Dans ce cas Teko se tait et les Paramètres
// indiquent comment installer la voix.

import * as Speech from "expo-speech";
import { create } from "zustand";

interface VoiceState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** null : pas encore vérifié ; false : aucune voix française installée. */
  frenchAvailable: boolean | null;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
  frenchAvailable: null,
}));

let frenchVoice: string | null | undefined;
let lookup: Promise<string | null> | undefined;

/** Voix française du moteur, préférence fr-FR ; null si aucune. Une liste
 *  vide (moteur pas encore prêt) n'est pas mémorisée. */
export function prepareVoice(): Promise<string | null> {
  if (frenchVoice !== undefined) return Promise.resolve(frenchVoice);
  lookup ??= Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const french = voices.filter((v) =>
        v.language?.toLowerCase().replace("_", "-").startsWith("fr"),
      );
      const chosen =
        french.find((v) => v.language.toLowerCase().replace("_", "-") === "fr-fr") ?? french[0];
      if (voices.length > 0) {
        frenchVoice = chosen?.identifier ?? null;
        useVoiceStore.setState({ frenchAvailable: frenchVoice !== null });
      }
      return chosen?.identifier ?? null;
    })
    .catch(() => null)
    .finally(() => {
      lookup = undefined;
    });
  return lookup;
}

/** Lit une phrase en français. Une nouvelle annonce remplace la précédente :
 *  l'information la plus récente prime pendant la conduite. */
export function announce(text: string): void {
  if (!useVoiceStore.getState().enabled || !text.trim()) return;
  void prepareVoice().then((voice) => {
    if (!voice || !useVoiceStore.getState().enabled) return;
    try {
      Speech.stop().catch(() => undefined);
      Speech.speak(text, { language: "fr-FR", voice, rate: 0.95 });
    } catch {
      // Moteur indisponible : l'écran reste la source d'information.
    }
  });
}

export function silence(): void {
  Speech.stop().catch(() => undefined);
}
