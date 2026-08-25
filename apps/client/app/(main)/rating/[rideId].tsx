// C-16 Évaluation — 5 étoiles ambre, compliments, commentaire optionnel.
// « Passer » comme Envoyer mènent au reçu : la note ne bloque jamais.
// RLS : le profil chauffeur peut être invisible → « Votre chauffeur ».

import { rateRide, TekoApiError } from "@teko/api-client";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDriverProfile, useRide } from "../../../src/features/payment/hooks";
import { nomCourt } from "../../../src/features/payment/format";
import { RatingForm } from "../../../src/features/payment/rating-form";
import type { Stars } from "../../../src/features/payment/rating-controls";
import { ErrorView, LoadingView } from "../../../src/features/payment/state-views";
import { useSession } from "../../../src/features/auth/use-session";
import { supabase } from "../../../src/lib/supabase";

export default function RatingScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const rideQ = useRide(rideId);
  const chauffeur = useDriverProfile(rideQ.data?.driver_id);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const versRecu = useCallback(
    () => router.replace(`/(main)/receipt/${rideId}` as Href),
    [router, rideId],
  );

  const envoyer = async (stars: Stars, commentaire: string | undefined) => {
    const ride = rideQ.data;
    const moi = session?.user.id;
    if (!ride?.driver_id || !moi) return versRecu();
    setBusy(true);
    setErreur(null);
    try {
      await rateRide(supabase, {
        rideId: ride.id,
        fromUser: moi,
        toUser: ride.driver_id,
        stars,
        ...(commentaire ? { comment: commentaire } : {}),
      });
      versRecu();
    } catch (e) {
      setBusy(false);
      setErreur(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("erreurs.generique"),
      );
    }
  };

  if (rideQ.isError)
    return <ErrorView error={rideQ.error} onRetry={() => void rideQ.refetch()} />;
  if (!rideQ.data) return <LoadingView />;

  const nom = chauffeur.data?.full_name ? nomCourt(chauffeur.data.full_name) : null;
  return (
    <RatingForm
      ride={rideQ.data}
      nomChauffeur={nom}
      busy={busy}
      erreur={erreur}
      onEnvoyer={(stars, commentaire) => void envoyer(stars, commentaire)}
      onPasser={versRecu}
    />
  );
}
