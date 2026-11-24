// Arrêts d'une course (lot R3) : ordre imposé par le serveur, attente
// gratuite trois minutes puis facturée à la minute entamée. Le montant fait
// foi côté serveur (wait_charged au départ de l'arrêt) ; ici, seulement
// l'affichage.

import type { RideStop } from "@teko/api-client";

/** Attente gratuite à un arrêt (réglage serveur route_change.free_wait_min). */
export const FREE_WAIT_S = 180;

export type StopPhase = "todo" | "waiting" | "done";

export function stopPhase(stop: Pick<RideStop, "arrivedAt" | "leftAt">): StopPhase {
  if (stop.leftAt) return "done";
  return stop.arrivedAt ? "waiting" : "todo";
}

/** Arrêt en cours : arrivé, pas reparti — bloque la fin de course. */
export function currentStop(stops: RideStop[]): RideStop | null {
  return stops.find((stop) => stopPhase(stop) === "waiting") ?? null;
}

/** Prochain arrêt à rejoindre, dans l'ordre ; aucun tant qu'un arrêt est en cours. */
export function nextStop(stops: RideStop[]): RideStop | null {
  if (currentStop(stops)) return null;
  return stops.find((stop) => stopPhase(stop) === "todo") ?? null;
}

export function waitSeconds(arrivedAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(arrivedAt)) / 1000));
}

/** Minutes entamées au-delà de la franchise, comme les compte le serveur. */
export function billedMinutes(waitS: number): number {
  return Math.max(0, Math.ceil(waitS / 60) - FREE_WAIT_S / 60);
}

export function mmss(totalS: number): string {
  const safe = Math.max(0, Math.floor(totalS));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function replaceStop(stops: RideStop[], updated: RideStop): RideStop[] {
  return stops.map((stop) => (stop.id === updated.id ? updated : stop));
}
