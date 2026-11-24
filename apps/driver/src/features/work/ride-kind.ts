// Nature d'une course côté chauffeur : classique, covoiturage à la place
// (lot R4) ou livraison (lot R5). Les écrans branchent sur ces prédicats,
// jamais sur des chaînes éparses.

import type { RideRow, RideStatus } from "@teko/types";

/** Statuts pendant lesquels le chauffeur a une course à conduire. */
export const DRIVER_ACTIVE_STATUSES: RideStatus[] = ["accepted", "enroute", "arrived", "started"];

export function isActiveStatus(status: RideStatus | null | undefined): boolean {
  return status != null && DRIVER_ACTIVE_STATUSES.includes(status);
}

export function isDelivery(ride: Pick<RideRow, "service_type"> | null | undefined): boolean {
  return ride?.service_type === "delivery";
}

export function isShared(ride: Pick<RideRow, "category"> | null | undefined): boolean {
  return ride?.category === "covoiturage";
}

/** Modification de trajet et arrêts : courses classiques seulement. */
export function isClassic(ride: Pick<RideRow, "category" | "service_type"> | null): boolean {
  return ride !== null && !isShared(ride) && !isDelivery(ride);
}
