// Covoiturage à la place (lot R4) : chaque passager a SA course (offre, PIN,
// encaissement, fin). Les courses actives d'un même trajet partagent
// `shared_trip_id` ; l'écran de course en affiche une et liste les autres.
// Lecture par l'historique RLS du chauffeur (listMyRides) : aucune donnée
// d'un passager n'est exposée au-delà de sa propre course.

import { listMyRides } from "@teko/api-client";
import type { RideRow, RideStatus } from "@teko/types";
import type { Href } from "expo-router";
import { supabase } from "../../lib/supabase";
import { isActiveStatus, isShared } from "./ride-kind";

export const HOME_HREF = "/(main)/home" as Href;
/** Fenêtre d'historique lue : large devant les 3 places d'un trajet. */
const TRIP_LOOKUP = 30;

export function rideHref(rideId: string): Href {
  return `/(main)/ride/${rideId}` as Href;
}

export interface SharedPassenger {
  rideId: string;
  /** Rang stable dans le trajet (ordre d'acceptation), dès 1. */
  number: number;
  seats: number;
  status: RideStatus;
  originHint: string | null;
  /** Montant de CETTE course (numeric Postgres → nombre). */
  amount: number;
  current: boolean;
}

export type PassengerAction = "aPrendre" | "code" | "aDeposer";

/** Action suivante du chauffeur pour ce passager. */
export function passengerAction(status: RideStatus): PassengerAction {
  if (status === "started") return "aDeposer";
  return status === "arrived" ? "code" : "aPrendre";
}

function acceptedOrder(a: RideRow, b: RideRow): number {
  return (a.accepted_at ?? a.created_at).localeCompare(b.accepted_at ?? b.created_at);
}

/** Passagers à bord ou attendus du trajet de `current`, course affichée comprise. */
export function tripPassengers(rides: RideRow[], current: RideRow): SharedPassenger[] {
  const tripId = current.shared_trip_id;
  const sameTrip = rides.filter((ride) => tripId !== null && ride.shared_trip_id === tripId);
  const trip = sameTrip.some((ride) => ride.id === current.id) ? sameTrip : [...sameTrip, current];
  return trip
    .map((ride) => (ride.id === current.id ? current : ride))
    .sort(acceptedOrder)
    .map((ride, index) => ({
      rideId: ride.id,
      number: index + 1,
      seats: ride.seats ?? 1,
      status: ride.status,
      originHint: ride.origin_hint,
      amount: Number(ride.price_final ?? ride.price_est ?? 0),
      current: ride.id === current.id,
    }))
    .filter((passenger) => passenger.current || isActiveStatus(passenger.status));
}

export function seatsTaken(passengers: SharedPassenger[]): number {
  return passengers
    .filter((passenger) => isActiveStatus(passenger.status))
    .reduce((total, passenger) => total + passenger.seats, 0);
}

export async function fetchTripPassengers(current: RideRow): Promise<SharedPassenger[]> {
  return tripPassengers(await listMyRides(supabase, TRIP_LOOKUP), current);
}

/** Sortie d'une course close : le passager suivant du covoiturage s'il en
 *  reste un (relu à l'instant sous JWT), l'accueil sinon. */
export function leaveRide(ride: RideRow | null, go: (href: Href) => void): void {
  if (!ride || !isShared(ride)) {
    go(HOME_HREF);
    return;
  }
  fetchTripPassengers(ride)
    .then((passengers) => {
      const next = passengers.find((p) => !p.current && isActiveStatus(p.status));
      go(next ? rideHref(next.rideId) : HOME_HREF);
    })
    .catch(() => go(HOME_HREF));
}
