// Passagers du covoiturage en cours (lot R4) : relus toutes les 5 s tant que
// la course affichée est un covoiturage — un passager peut s'ajouter (offre
// acceptée) ou partir (annulation, fin de sa course) à tout moment.

import type { RideRow, RideStatus } from "@teko/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { isActiveStatus, isShared } from "./ride-kind";
import { fetchTripPassengers, type SharedPassenger, seatsTaken } from "./shared-rides";

export const SHARED_POLL_MS = 5_000;

export interface SharedRides {
  /** Vrai pour une course de covoiturage : l'écran montre la liste. */
  shared: boolean;
  passengers: SharedPassenger[];
  seatsTaken: number;
  /** Autre course active du trajet (suivi GPS quand celle-ci est close). */
  otherActiveId: string | null;
}

export function useSharedRides(ride: RideRow | null, status: RideStatus | null): SharedRides {
  const shared = isShared(ride);
  const [fetched, setFetched] = useState<SharedPassenger[]>([]);
  const rideRef = useRef(ride);
  rideRef.current = ride;
  const rideId = ride?.id;

  useEffect(() => {
    if (!shared || !rideId) return;
    let cancelled = false;
    const refresh = () => {
      const current = rideRef.current;
      if (!current) return;
      fetchTripPassengers(current)
        .then((list) => {
          if (!cancelled) setFetched(list);
        })
        .catch(() => {
          // Réseau : la liste connue reste affichée.
        });
    };
    refresh();
    const poll = setInterval(() => {
      if (AppState.currentState !== "background") refresh();
    }, SHARED_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [shared, rideId]);

  return useMemo(() => {
    if (!shared || !ride) return { shared, passengers: [], seatsTaken: 0, otherActiveId: null };
    // Le statut de la course affichée vient de l'écran (canal temps réel).
    const live = status ?? ride.status;
    const known = fetched.some((p) => p.rideId === ride.id);
    const base: SharedPassenger[] = known
      ? fetched
      : [
          {
            rideId: ride.id,
            number: 1,
            seats: ride.seats ?? 1,
            status: live,
            originHint: ride.origin_hint,
            amount: Number(ride.price_final ?? ride.price_est ?? 0),
            current: true,
          },
        ];
    const passengers = base.map((p) => (p.rideId === ride.id ? { ...p, status: live } : p));
    const other = passengers.find((p) => !p.current && isActiveStatus(p.status));
    return {
      shared,
      passengers,
      seatsTaken: seatsTaken(passengers),
      otherActiveId: other?.rideId ?? null,
    };
  }, [shared, ride, status, fetched]);
}
