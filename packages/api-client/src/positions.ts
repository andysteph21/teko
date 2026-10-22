// Canal de positions temps réel — ADR-13 : les apps ne parlent JAMAIS à
// Supabase Realtime directement pour les positions ; elles passent par cette
// abstraction, remplaçable (WebSocket/MQTT co-localisé) si le fan-out
// Realtime devient limitant (~1 000 chauffeurs simultanés, risque R-A).

import type { RealtimeChannel } from "@supabase/supabase-js";
import { ewktPoint, type GeomInput, type LonLat, roundPosition, toLonLat } from "@teko/maps";
import type { RideStatus } from "@teko/types";
import type { TekoClient } from "./client";
import { mapApiError } from "./errors";

export interface RidePositionEvent extends LonLat {
  rideId: string;
  recordedAt: string;
}

export type Unsubscribe = () => Promise<void>;

export interface PositionsChannel {
  /** Positions live d'une course (C-13/C-14, partage) — RLS : participants. */
  subscribeRidePositions(rideId: string, onPosition: (e: RidePositionEvent) => void): Unsubscribe;
  /** Statut de la course (accepted → arrived → started → completed). */
  subscribeRideStatus(rideId: string, onStatus: (status: RideStatus) => void): Unsubscribe;
  /** Écriture chauffeur pendant la course (position arrondie, sobriété). */
  pushRidePosition(
    rideId: string,
    position: LonLat,
    sample?: { id: string; recordedAt: string },
  ): Promise<void>;
}

export interface RealtimePositionsOptions {
  /** Mode éco : arrondi ~11 m au lieu de ~1 m (C-25). */
  eco?: boolean;
  driverId?: string;
}

/** Implémentation Supabase Realtime (postgres_changes, RLS respectée). */
export function createRealtimePositionsChannel(
  client: TekoClient,
  options: RealtimePositionsOptions = {},
): PositionsChannel {
  const remove = (channel: RealtimeChannel): Unsubscribe => {
    return async () => {
      await client.removeChannel(channel);
    };
  };

  return {
    subscribeRidePositions(rideId, onPosition) {
      const channel = client
        .channel(`ride-positions-${rideId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ride_locations",
            filter: `ride_id=eq.${rideId}`,
          },
          (payload) => {
            const row = payload.new as { ride_id: string; geom: GeomInput; recorded_at: string };
            onPosition({ rideId: row.ride_id, recordedAt: row.recorded_at, ...toLonLat(row.geom) });
          },
        )
        .subscribe();
      return remove(channel);
    },

    subscribeRideStatus(rideId, onStatus) {
      const channel = client
        .channel(`ride-status-${rideId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
          (payload) => onStatus((payload.new as { status: RideStatus }).status),
        )
        .subscribe();
      return remove(channel);
    },

    async pushRidePosition(rideId, position, sample) {
      const rounded = roundPosition(position, options.eco ?? false);
      let driverId = options.driverId;
      if (!driverId) {
        const identity = await client.auth.getUser();
        if (identity.error) throw mapApiError(identity.error);
        driverId = identity.data.user?.id;
      }
      const row = {
        ride_id: rideId,
        driver_id: driverId as string,
        geom: ewktPoint(rounded),
        ...(sample ? { sample_id: sample.id, recorded_at: sample.recordedAt } : {}),
      };
      const table = client.from("ride_locations");
      const { error } = sample
        ? await table.upsert(row, { onConflict: "sample_id", ignoreDuplicates: true })
        : await table.insert(row);
      if (error) throw mapApiError(error);
    },
  };
}
