// Partage du trajet (C-14 / C-27) — create_trip_share (jeton public TTL 24 h)
// puis feuille de partage native. Le lien pointe vers la page publique de
// suivi (get_shared_trip, appelable sans session).

import { createTripShare, TekoApiError } from "@teko/api-client";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Share } from "react-native";
import { supabase } from "../../lib/supabase";

// TODO domaine réel — aligner avec la page web publique de suivi.
const SHARE_BASE_URL = "https://teko.ga/t";

export function shareLink(token: string): string {
  return `${SHARE_BASE_URL}/${token}`;
}

export function shareErrorLabel(e: unknown, t: (key: string) => string): string {
  return e instanceof TekoApiError && e.code === "network"
    ? t("erreurs.reseau")
    : t("erreurs.generique");
}

/** Écran suivi : erreurs en alerte native ; C-27 gère les siennes en ligne. */
export function useShareTrip(rideId: string | undefined) {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);

  /** Avec un code de remise (livraison), le message porte le lien ET le code. */
  const share = useCallback(
    async (deliveryCode?: string) => {
      if (!rideId) return;
      setSharing(true);
      try {
        const trip = await createTripShare(supabase, rideId);
        const lien = shareLink(trip.token);
        await Share.share({
          message: deliveryCode
            ? t("ride:livraison.partageMessage", { lien, code: deliveryCode })
            : t("ride:suivi.partageMessage", { lien }),
        });
      } catch (e) {
        Alert.alert(shareErrorLabel(e, t));
      } finally {
        setSharing(false);
      }
    },
    [rideId, t],
  );

  return { sharing, share };
}
