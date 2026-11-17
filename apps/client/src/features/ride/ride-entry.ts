// Aiguillage à l'entrée du suivi : le panneau « Votre chauffeur arrive » ne
// vaut que pour une course attribuée. Une notification, l'historique ou la
// reprise de l'app peuvent ouvrir une course encore en recherche ou déjà
// close (retour terrain du 10 novembre 2026 : PIN affiché pour une course
// annulée, sans chauffeur).

import type { RideStatus } from "@teko/types";
import type { Href } from "expo-router";

const TRACKED: RideStatus[] = ["accepted", "enroute", "arrived", "started"];

/** Écran à ouvrir à la place du suivi, ou null si la course se suit. */
export function rideEntryRedirect(ride: { id: string; status: RideStatus }): Href | null {
  if (TRACKED.includes(ride.status)) return null;
  if (ride.status === "requested") {
    return { pathname: "/(main)/searching", params: { rideId: ride.id } } as Href;
  }
  return `/(main)/history/${ride.id}` as Href;
}
