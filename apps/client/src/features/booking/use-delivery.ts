// Livraison de colis (R5) : devis serveur voiture et moto (grille propre,
// refusée tant que le service est fermé), puis request_delivery avec le
// colis. Paiement en espèces à la remise du colis au coursier.

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getRideQuote,
  quoteRoute,
  type RideQuote,
  requestDelivery,
  TekoApiError,
  type TekoApiErrorCode,
} from "@teko/api-client";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { supabase } from "../../lib/supabase";
import { EMPTY_PARCEL, type ParcelDraft, toParcelInput } from "./parcel";
import { shareOrderPosition } from "./share-order-position";
import { type PlacePick, useBookingStore } from "./store";

export type DeliveryVehicle = "eco" | "moto";
export const DELIVERY_VEHICLES: readonly DeliveryVehicle[] = ["eco", "moto"];
export type DeliveryQuotes = Partial<Record<DeliveryVehicle, RideQuote>>;

const ERROR_KEYS: Partial<Record<TekoApiErrorCode, string>> = {
  network: "erreurs.reseau",
  quote_expired: "booking:rencontre.devisExpire",
  fees_due: "booking:rencontre.fraisDus",
  service_closed: "booking:livraison.bientotTexte",
};

/** Un véhicule sans devis est simplement absent ; aucun devis = erreur. */
export async function fetchDeliveryQuotes(
  origin: PlacePick,
  destination: PlacePick,
): Promise<DeliveryQuotes> {
  const settled = await Promise.allSettled(
    DELIVERY_VEHICLES.map((category) =>
      getRideQuote(supabase, {
        category,
        origin: origin.position,
        destination: destination.position,
        service: "delivery",
      }),
    ),
  );
  const quotes: DeliveryQuotes = {};
  settled.forEach((result, index) => {
    const vehicle = DELIVERY_VEHICLES[index];
    if (result.status === "fulfilled" && vehicle) quotes[vehicle] = result.value;
  });
  if (Object.keys(quotes).length > 0) return quotes;
  const failure = settled.find((result) => result.status === "rejected");
  throw failure?.reason ?? new TekoApiError("unknown", "Devis de livraison indisponible");
}

function useDeliveryQuotes(origin: PlacePick | null, destination: PlacePick | null) {
  return useQuery({
    queryKey: [
      "delivery-quotes",
      origin?.position.lon,
      origin?.position.lat,
      destination?.position.lon,
      destination?.position.lat,
    ],
    enabled: Boolean(origin && destination),
    staleTime: 60_000,
    queryFn: () => {
      if (!origin || !destination) throw new Error("brouillon incomplet");
      return fetchDeliveryQuotes(origin, destination);
    },
    networkMode: "always",
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}

export function useDelivery() {
  const router = useRouter();
  const { origin, destination } = useBookingStore(
    useShallow((s) => ({ origin: s.origin, destination: s.destination })),
  );
  const [vehicle, setVehicle] = useState<DeliveryVehicle>("eco");
  const [parcel, setParcel] = useState<ParcelDraft>(EMPTY_PARCEL);
  const quotes = useDeliveryQuotes(origin, destination);
  // Un véhicule sans devis cède la place à celui qui en a un.
  const quote = quotes.data?.[vehicle] ?? quotes.data?.eco ?? quotes.data?.moto ?? null;
  const input = toParcelInput(parcel);

  const order = useMutation({
    mutationFn: async () => {
      if (!quote || !input) throw new TekoApiError("unknown", "livraison incomplète");
      return requestDelivery(supabase, {
        quoteId: quote.id,
        parcel: input,
        originHint: origin?.hint,
        destinationHint: destination?.hint,
        originLandmarkId: origin?.landmarkId,
        destinationLandmarkId: destination?.landmarkId,
      });
    },
    onSuccess: (ride) => {
      void shareOrderPosition(ride.id);
      if (quote) {
        useBookingStore.setState({ route: quoteRoute(quote), deliveryPrice: Number(quote.price) });
      }
      router.replace({ pathname: "/(main)/searching", params: { rideId: ride.id } } as Href);
    },
    onError: (error) => {
      // Devis expiré : un nouveau prix est demandé avant toute nouvelle tentative.
      if (error instanceof TekoApiError && error.code === "quote_expired") void quotes.refetch();
    },
  });

  const code = order.error instanceof TekoApiError ? order.error.code : "unknown";
  return {
    origin,
    destination,
    vehicle: (quote?.category ?? vehicle) as DeliveryVehicle,
    setVehicle,
    parcel,
    setParcel,
    quotes,
    quote,
    ready: Boolean(quote && input),
    submit: () => order.mutate(),
    busy: order.isPending,
    errorKey: order.error ? (ERROR_KEYS[code] ?? "erreurs.generique") : null,
  };
}

export type DeliveryController = ReturnType<typeof useDelivery>;
