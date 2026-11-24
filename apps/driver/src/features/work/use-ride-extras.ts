// Compléments de l'écran de course selon sa nature : modification de trajet
// et arrêts (course classique, lot R3), passagers et offres supplémentaires
// (covoiturage, lot R4), colis et remise (livraison, lot R5). Un seul des
// trois jeux est actif à la fois ; les autres ne lisent rien.

import { useCallback } from "react";
import { useSession } from "../auth/use-session";
import { isActiveStatus, isClassic, isShared } from "./ride-kind";
import { type DeliveryState, useDelivery } from "./use-delivery";
import type { DriverRide } from "./use-driver-ride";
import { type OfferFeed, useOfferFeed } from "./use-offer-feed";
import { type RideStops, useRideStops } from "./use-ride-stops";
import { type RouteChangeState, useRouteChange } from "./use-route-change";
import { type SharedRides, useSharedRides } from "./use-shared-rides";

export interface RideExtras {
  routeChange: RouteChangeState;
  stops: RideStops;
  shared: SharedRides;
  /** Offres d'un passager supplémentaire, pendant un covoiturage seulement. */
  feed: OfferFeed;
  delivery: DeliveryState;
}

export function useRideExtras(state: DriverRide): RideExtras {
  const { ride, status, reload, applyRide } = state;
  const { session } = useSession();
  const active = isActiveStatus(status);
  const classic = isClassic(ride) && active;

  const stops = useRideStops(ride?.id, classic, reload);
  const reloadStops = stops.reload;
  const onAccepted = useCallback(() => {
    reload();
    reloadStops();
  }, [reload, reloadStops]);

  return {
    routeChange: useRouteChange(ride?.id, classic, onAccepted),
    stops,
    shared: useSharedRides(ride, status),
    feed: useOfferFeed(session?.user.id, isShared(ride) && active),
    delivery: useDelivery(ride, applyRide),
  };
}
