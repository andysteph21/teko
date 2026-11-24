// Formulaire colis (R5) — validation locale alignée sur le serveur
// (request_delivery) : description 1 à 200 caractères, taille imposée, nom du
// destinataire 1 à 80, numéro de 8 à 15 chiffres. Le serveur reste juge.

import type { ParcelInput, ParcelSize } from "@teko/api-client";

export const DESCRIPTION_MAX = 200;
export const RECIPIENT_NAME_MAX = 80;
export const PARCEL_SIZES: readonly ParcelSize[] = ["small", "medium", "large"];

export interface ParcelDraft {
  description: string;
  size: ParcelSize;
  recipientName: string;
  recipientPhone: string;
}

export const EMPTY_PARCEL: ParcelDraft = {
  description: "",
  size: "small",
  recipientName: "",
  recipientPhone: "",
};

export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isRecipientPhoneValid(raw: string): boolean {
  const digits = phoneDigits(raw);
  return digits.length >= 8 && digits.length <= 15;
}

/** Colis prêt à envoyer, ou null tant qu'un champ manque ou déborde. */
export function toParcelInput(draft: ParcelDraft): ParcelInput | null {
  const description = draft.description.trim();
  const recipientName = draft.recipientName.trim();
  if (description.length < 1 || description.length > DESCRIPTION_MAX) return null;
  if (recipientName.length < 1 || recipientName.length > RECIPIENT_NAME_MAX) return null;
  if (!PARCEL_SIZES.includes(draft.size) || !isRecipientPhoneValid(draft.recipientPhone)) {
    return null;
  }
  return {
    description,
    size: draft.size,
    recipientName,
    recipientPhone: phoneDigits(draft.recipientPhone),
  };
}
