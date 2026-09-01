// Modes de paiement proposés au client (pastilles C-10).
//
// Airtel Money est MASQUÉ tant que le compte marchand n'est pas ouvert hors
// sandbox (mesure temporaire du 2 sept. 2026, docs/product/05-questions-ouvertes.md).
// Remettre "airtel" ici suffit à réafficher la pastille : le backend, l'écran
// de paiement C-15 et l'historique gèrent déjà les deux modes.

import type { PaymentMethod } from "@teko/types";

export const OFFERED_PAYMENT_METHODS: readonly PaymentMethod[] = ["cash"];
