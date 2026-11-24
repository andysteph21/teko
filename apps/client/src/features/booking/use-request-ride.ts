// C-11 → C-12 : commande immédiate cash à partir d'un devis serveur confirmé.
// Les brouillons hérités planifiés ou Airtel sont refusés pendant l'alpha.

import { useMutation } from "@tanstack/react-query";
import {
  quoteRoute,
  type RideQuote,
  requestQuotedRide,
  TekoApiError,
  type TekoApiErrorCode,
} from "@teko/api-client";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { supabase } from "../../lib/supabase";
import { shareOrderPosition } from "./share-order-position";
import { type MeetingPick, useBookingStore } from "./store";

/** Refus de commande expliqués au passager ; tout autre code reste générique. */
const ERROR_KEYS: Partial<Record<TekoApiErrorCode, string>> = {
  network: "erreurs.reseau",
  quote_expired: "booking:rencontre.devisExpire",
  fees_due: "booking:rencontre.fraisDus",
};

export interface RequestConfirmation {
  quote: RideQuote;
  meeting: MeetingPick | null;
}

export interface RequestRideController {
  /** Envoie la demande construite depuis le brouillon du store. */
  request: (confirmed?: RequestConfirmation) => void;
  busy: boolean;
  /** Message français prêt à afficher (TekoApiError.code → clé i18n). */
  errorMessage: string | null;
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
      quotes: s.quotes,
    })),
  );

  const mutation = useMutation({
    mutationFn: async (confirmed?: RequestConfirmation) => {
      const { origin, destination, route } = draft;
      if (!origin || !destination || !route) {
        throw new TekoApiError("unknown", "brouillon de commande incomplet");
      }
      if (draft.scheduledAt || draft.paymentMethod !== "cash") {
        throw new TekoApiError("unknown", "Fonction indisponible pendant l’alpha");
      }
      const quote = confirmed?.quote ?? draft.quotes[draft.category];
      if (!quote) throw new TekoApiError("unknown", "Devis requis");
      return requestQuotedRide(supabase, {
        quoteId: quote.id,
        originLandmarkId: confirmed?.meeting?.id ?? origin.landmarkId,
        destinationLandmarkId: destination.landmarkId,
        meetingLandmarkId: confirmed?.meeting?.id,
        originHint: confirmed?.meeting ? undefined : origin.hint,
        destinationHint: destination.hint,
      });
    },
    onSuccess: (ride, confirmed) => {
      void shareOrderPosition(ride.id);
      if (confirmed) {
        const store = useBookingStore.getState();
        const { quote, meeting } = confirmed;
        if (meeting)
          store.setOrigin({
            position: meeting.position,
            label: meeting.name,
            landmarkId: meeting.id,
          });
        store.setMeeting(meeting);
        store.setQuotes({ [quote.category]: quote });
        store.setRouteAndEstimates(quoteRoute(quote), { [quote.category]: Number(quote.price) });
      }
      router.replace({
        pathname: "/(main)/searching",
        params: { rideId: ride.id },
      } as Href);
    },
  });

  const code = mutation.error instanceof TekoApiError ? mutation.error.code : null;
  const errorMessage = mutation.error
    ? t(ERROR_KEYS[code ?? "unknown"] ?? "erreurs.generique")
    : null;

  return {
    request: (confirmed) => mutation.mutate(confirmed),
    busy: mutation.isPending,
    errorMessage,
  };
}
