// Adaptateur de données carte ↔ Supabase.
//
// Toute la connaissance « backend » de la carte vit ici : RPC repères,
// heartbeat de présence, positions de course (écriture chauffeur, lecture
// temps réel via Realtime/postgres_changes — la RLS limite aux participants).
// Les composants carte (web/RN) ne voient que du GeoJSON et des callbacks.

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ewktPoint, type GeomInput, type LonLat, roundPosition, toLonLat } from "./geo";
import { type FeatureCollection, type LandmarkRow, landmarksToGeoJson } from "./geojson";

export interface NearestLandmarksOptions {
  maxM?: number;
  limit?: number;
}

export interface RidePositionEvent extends LonLat {
  rideId: string;
  recordedAt: string;
}

export interface ProposeLandmarkInput {
  name: string;
  category:
    | "fuel_station"
    | "roundabout"
    | "market"
    | "church"
    | "school"
    | "pharmacy"
    | "bar"
    | "building"
    | "junction"
    | "other";
  position: LonLat;
  aliases?: string[];
  photoUrl?: string;
}

export class TekoMapData {
  constructor(
    private readonly supabase: SupabaseClient,
    /** Mode éco : arrondit plus fort les positions envoyées (~11 m). */
    public eco = false,
  ) {}

  /** Repères validés autour d'un point (épingles ambre + fiche repère). */
  async nearestLandmarks(
    center: LonLat,
    opts: NearestLandmarksOptions = {},
  ): Promise<FeatureCollection> {
    const { data, error } = await this.supabase.rpc("nearest_landmarks", {
      p_point: ewktPoint(center),
      p_max_m: opts.maxM ?? 500,
      p_limit: opts.limit ?? 5,
    });
    if (error) throw new Error(`nearest_landmarks: ${error.message}`);
    return landmarksToGeoJson((data ?? []) as LandmarkRow[]);
  }

  /** Point de rendez-vous suggéré (C-09) — null si aucun repère proche.
   *  La RPC renvoie l'uuid du repère ; on complète avec sa fiche. */
  async suggestMeetingLandmark(
    center: LonLat,
  ): Promise<{ id: string; name: string; position: LonLat } | null> {
    const { data: id, error } = await this.supabase.rpc("suggest_meeting_landmark", {
      p_point: ewktPoint(center),
    });
    if (error) throw new Error(`suggest_meeting_landmark: ${error.message}`);
    if (!id) return null;
    const { data: row, error: e2 } = await this.supabase
      .from("landmarks")
      .select("id, name, geom")
      .eq("id", id)
      .single();
    if (e2) throw new Error(`suggest_meeting_landmark (fiche): ${e2.message}`);
    return { id: row.id, name: row.name, position: toLonLat(row.geom) };
  }

  /** Proposition de repère (C-26) — validée ensuite par un admin carto. */
  async proposeLandmark(input: ProposeLandmarkInput): Promise<{ id: string; status: string }> {
    const { data, error } = await this.supabase.rpc("propose_landmark", {
      p_name: input.name,
      p_category: input.category,
      p_point: ewktPoint(roundPosition(input.position)),
      p_aliases: input.aliases ?? [],
      p_photo: input.photoUrl ?? null,
    });
    if (error) throw new Error(`propose_landmark: ${error.message}`);
    return { id: data.id, status: data.status };
  }

  /** Heartbeat chauffeur (toggle « en ligne » D-09) — position arrondie. */
  async driverHeartbeat(position: LonLat): Promise<void> {
    const { error } = await this.supabase.rpc("driver_heartbeat", {
      p_point: ewktPoint(roundPosition(position, this.eco)),
    });
    if (error) throw new Error(`driver_heartbeat: ${error.message}`);
  }

  /** Position live d'une course (écrite par le chauffeur pendant la course). */
  async pushRidePosition(rideId: string, position: LonLat): Promise<void> {
    const p = roundPosition(position, this.eco);
    const { data: userData } = await this.supabase.auth.getUser();
    const { error } = await this.supabase.from("ride_locations").insert({
      ride_id: rideId,
      driver_id: userData.user?.id,
      geom: ewktPoint(p),
    });
    if (error) throw new Error(`pushRidePosition: ${error.message}`);
  }

  /**
   * Suivi temps réel des positions d'une course (C-13 / partage de trajet).
   * postgres_changes respecte la RLS : seuls les participants reçoivent.
   * Retourne le canal — à passer à `unsubscribe` quand l'écran se ferme.
   */
  subscribeRidePositions(
    rideId: string,
    onPosition: (e: RidePositionEvent) => void,
  ): RealtimeChannel {
    return this.supabase
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
          const p = toLonLat(row.geom);
          onPosition({ rideId: row.ride_id, recordedAt: row.recorded_at, ...p });
        },
      )
      .subscribe();
  }

  /** Suivi temps réel du statut de la course (accepted → … → completed). */
  subscribeRideStatus(rideId: string, onStatus: (status: string) => void): RealtimeChannel {
    return this.supabase
      .channel(`ride-status-${rideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
        (payload) => onStatus((payload.new as { status: string }).status),
      )
      .subscribe();
  }

  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    await this.supabase.removeChannel(channel);
  }
}
