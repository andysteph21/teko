// Abstraction d'envoi push — même patron que _shared/payments : un contrat,
// des fournisseurs (fcm réel, mock local/CI), résolution par variable d'env.

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  /** Données applicatives (type + payload de la notification). */
  data: Record<string, string>;
  /** Durée de vie côté FCM (ex. « 15s » pour une offre de course). */
  ttl?: string;
}

export interface PushResult {
  ok: boolean;
  /** Jeton invalide → l'appareil doit être purgé de `devices`. */
  invalidToken?: boolean;
  detail?: string;
}

export interface PushProvider {
  readonly name: string;
  send(message: PushMessage): Promise<PushResult>;
}

/** Titres/corps français par type de notification — le libellé est porté
 *  par le serveur pour que l'app affiche juste (et pour l'i18n future). */
export function messageForType(
  type: string,
  payload: Record<string, unknown>,
): { title: string; body: string; ttl?: string } {
  switch (type) {
    case "ride_offer":
      return { title: "Nouvelle course à proximité", body: "Vous avez 12 secondes pour accepter.", ttl: "15s" };
    case "ride_accepted":
      return { title: "Chauffeur attribué", body: "Votre chauffeur est en route." };
    case "driver_arrived":
      return { title: "Votre chauffeur est arrivé", body: "Communiquez votre code de prise en charge." };
    case "ride_completed":
      return { title: "Course terminée", body: "Merci d'avoir voyagé avec Teko." };
    case "cancellation_fee":
      return { title: "Frais d'annulation appliqués", body: "Le détail est dans vos notifications." };
    case "no_driver_found":
      return { title: "Aucun chauffeur disponible", body: "Réessayez dans quelques minutes." };
    case "settlement_reminder": {
      const amount = typeof payload.amount === "number" ? `${payload.amount} F` : "votre solde";
      return { title: "Clôture à 04 h 00", body: `Réglez ${amount} avant la clôture pour rester en ligne.` };
    }
    case "sos_alert":
      return { title: "Alerte SOS", body: "Un utilisateur a déclenché un SOS — ouvrir la console.", ttl: "60s" };
    case "kyc_validated":
      return { title: "Dossier validé", body: "Vous pouvez passer en ligne et recevoir des courses." };
    case "kyc_rejected":
      return { title: "Une pièce est à corriger", body: "Ouvrez l'app pour voir le motif et remplacer la pièce." };
    case "landmark_accepted":
      return { title: "Repère accepté", body: "Votre repère aide maintenant tout Libreville." };
    case "landmark_rejected":
      return { title: "Repère refusé", body: "Le motif est dans vos notifications." };
    default:
      return { title: "Teko", body: "Vous avez une nouvelle notification." };
  }
}
