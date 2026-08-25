// C-11 → C-12 : envoi de la demande de course (request_ride). Course
// immédiate → écran radar C-12 ; course planifiée (C-18) → l'écran hôte
// affiche la confirmation « Course planifiée » (pas de radar), bifurcation
// pilotée par `scheduledConfirmed`.

import { useMutation } from "@tanstack/react-query";
import { requestRide, TekoApiError } from "@teko/api-client";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { supabase } from "../../lib/supabase";
import { useBookingStore } from "./store";

export interface RequestRideController {
  /** Envoie la demande construite depuis le brouillon du store. */
  request: () => void;
  busy: boolean;
  /** Message français prêt à afficher (TekoApiError.code → clé i18n). */
  errorMessage: string | null;
  /** Course planifiée acceptée — l'écran affiche la confirmation C-18. */
  scheduledConfirmed: boolean;
}

export function useRequestRide(): RequestRideController {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useBookingStore(
    useShallow((s) => ({
      origin: s.origin,
      destination: s.destination,
      category: s.category,
      paymentMethod: s.paymentMethod,
      scheduledAt: s.scheduledAt,
      route: s.route,
    })),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const { origin, destination, route } = draft;
      if (!origin || !destination || !route) {
        throw new TekoApiError("unknown", "brouillon de commande incomplet");
      }
      return requestRide(supabase, {
        category: draft.category,
        origin: origin.position,
        destination: destination.position,
        distanceM: route.distanceM,
        durationS: route.durationS,
        paymentMethod: draft.paymentMethod,
        scheduledAt: draft.scheduledAt ?? undefined,
        destinationLandmarkId: destination.landmarkId,
        originHint: origin.hint,
        destinationHint: destination.hint,
      });
    },
    onSuccess: (ride) => {
      if (draft.scheduledAt) return; // C-18 : confirmation rendue par l'écran.
      router.replace({
        pathname: "/(main)/searching",
        params: { rideId: ride.id },
      } as Href);
    },
  });

  const errorMessage = mutation.error
    ? mutation.error instanceof TekoApiError && mutation.error.code === "network"
      ? t("erreurs.reseau")
      : t("erreurs.generique")
    : null;

  return {
    request: () => mutation.mutate(),
    busy: mutation.isPending,
    errorMessage,
    scheduledConfirmed: Boolean(draft.scheduledAt) && mutation.isSuccess,
  };
}
