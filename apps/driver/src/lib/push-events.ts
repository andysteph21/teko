type Listener = (id: string) => void;
const listeners = new Set<Listener>();
export function onPushOffer(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function emitPushOffer(offerId: string): void {
  for (const listener of listeners) listener(offerId);
}

/** Demande de modification de trajet reçue par push (lot R3). */
const routeChangeListeners = new Set<Listener>();
export function onPushRouteChange(listener: Listener): () => void {
  routeChangeListeners.add(listener);
  return () => {
    routeChangeListeners.delete(listener);
  };
}
export function emitPushRouteChange(rideId: string): void {
  for (const listener of routeChangeListeners) listener(rideId);
}
