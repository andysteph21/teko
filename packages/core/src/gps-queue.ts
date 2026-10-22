// Politique de reprise GPS : aucune commande métier, propriétaire obligatoire,
// durée limitée, envoi dans l'ordre et reprise après une panne réseau.
export const GPS_QUEUE_TTL_MS = 24 * 60 * 60 * 1000;
export interface QueuedGpsPoint {
  id: string;
  userId: string;
  rideId: string;
  lon: number;
  lat: number;
  recordedAt: number;
}
export interface GpsQueueStorage {
  purge(userId: string, before: number): Promise<void>;
  read(userId: string, limit: number): Promise<QueuedGpsPoint[]>;
  remove(id: string): Promise<void>;
}

export async function drainGpsQueue(input: {
  userId: string;
  storage: GpsQueueStorage;
  send: (point: QueuedGpsPoint) => Promise<void>;
  now?: number;
}): Promise<void> {
  const now = input.now ?? Date.now();
  await input.storage.purge(input.userId, now - GPS_QUEUE_TTL_MS);
  const points = await input.storage.read(input.userId, 50);
  for (const point of points) {
    if (point.userId !== input.userId || point.recordedAt <= now - GPS_QUEUE_TTL_MS) {
      await input.storage.remove(point.id);
      continue;
    }
    try {
      await input.send(point);
    } catch (error) {
      // Un refus permanent (course terminée/compte changé) ne doit pas
      // immobiliser toute la file. Une panne réseau conserve les points.
      if ((error as { code?: string })?.code !== "not_authorized") return;
    }
    await input.storage.remove(point.id);
  }
}
