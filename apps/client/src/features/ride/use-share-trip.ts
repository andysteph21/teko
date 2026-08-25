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

  const share = useCallback(async () => {
    if (!rideId) return;
    setSharing(true);
    try {
      const trip = await createTripShare(supabase, rideId);
      await Share.share({
        message: t("ride:suivi.partageMessage", { lien: shareLink(trip.token) }),
      });
    } catch (e) {
      Alert.alert(shareErrorLabel(e, t));
    } finally {
      setSharing(false);
    }
  }, [rideId, t]);

  return { sharing, share };
}
