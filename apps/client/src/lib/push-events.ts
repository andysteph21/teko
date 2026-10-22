type Listener = (offerId: string) => void;
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
