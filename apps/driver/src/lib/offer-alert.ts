// Alerte de proposition de course (chantier du 17 novembre 2026) : un canal
// Android dédié et une vibration reprise tant que la proposition est ouverte.

export const OFFER_CHANNEL = "teko-offers";
export const OFFER_SOUND = "teko_offre.wav";
/** Trois longues vibrations puis une pause ; rejouées en boucle en appli. */
export const OFFER_VIBRATION = [0, 700, 350, 700, 350, 700, 1200];
