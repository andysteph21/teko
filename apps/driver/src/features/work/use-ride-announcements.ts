// Annonces vocales pendant la course (option C) : à chaque changement de
// statut, et une fois à l'approche du point de rencontre puis de la
// destination. Le nom des repères est lu en base (repères validés).

import { landmarkNames } from "@teko/api-client";
import { distanceM, type LonLat } from "@teko/maps";
import type { RideRow, RideStatus } from "@teko/types";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { announce } from "../../lib/voice";
import {
  ARRIVED_PHRASE,
  approachPhrase,
  DESTINATION_NEAR_PHRASE,
  NEAR_M,
  pickupPhrase,
  startedPhrase,
} from "./voice-phrases";

interface Names {
  meeting: string | null;
  destination: string | null;
}

function useLandmarkNames(ride: RideRow | null): Names | null {
  const [names, setNames] = useState<Names | null>(null);
  const rideId = ride?.id;
  const meetingId = ride?.meeting_landmark_id ?? ride?.origin_landmark_id ?? null;
  const destinationId = ride?.dest_landmark_id ?? null;
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    const ids = [meetingId, destinationId].filter((id): id is string => Boolean(id));
    void landmarkNames(supabase, ids)
      .catch(() => ({}) as Record<string, string>)
      .then((map) => {
        if (cancelled) return;
        setNames({
          meeting: meetingId ? (map[meetingId] ?? null) : null,
          destination: destinationId ? (map[destinationId] ?? null) : null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [rideId, meetingId, destinationId]);
  return names;
}

function statusPhrase(status: RideStatus, ride: RideRow, names: Names): string | null {
  if (status === "accepted" || status === "enroute")
    return pickupPhrase(names.meeting, ride.origin_hint);
  if (status === "arrived") return ARRIVED_PHRASE;
  if (status === "started") return startedPhrase(names.destination, ride.dest_hint);
  return null;
}

/** Annonce de proximité due (clé unique par course et phase), ou null. */
function nearAnnouncement(
  ride: RideRow,
  status: RideStatus,
  names: Names,
  at: { position: LonLat; origin: LonLat | null; destination: LonLat | null },
): { key: string; phrase: string } | null {
  const { position, ...targets } = at;
  const pickup = status === "accepted" || status === "enroute";
  const target = pickup ? targets.origin : status === "started" ? targets.destination : null;
  if (!target || distanceM(position, target) > NEAR_M) return null;
  return {
    key: `${ride.id}:near:${pickup ? "pickup" : "dropoff"}`,
    phrase: pickup ? approachPhrase(names.meeting, ride.origin_hint) : DESTINATION_NEAR_PHRASE,
  };
}

export function useRideAnnouncements(input: {
  ride: RideRow | null;
  status: RideStatus | null;
  origin: LonLat | null;
  destination: LonLat | null;
  position: LonLat | null;
}): void {
  const { ride, status, origin, destination, position } = input;
  const names = useLandmarkNames(ride);
  const spoken = useRef(new Set<string>());

  useEffect(() => {
    if (!ride || !status || !names) return;
    const key = `${ride.id}:${status === "enroute" ? "accepted" : status}`;
    if (spoken.current.has(key)) return;
    const phrase = statusPhrase(status, ride, names);
    if (!phrase) return;
    spoken.current.add(key);
    announce(phrase);
  }, [ride, status, names]);

  useEffect(() => {
    if (!ride || !status || !names || !position) return;
    const due = nearAnnouncement(ride, status, names, { position, origin, destination });
    if (!due || spoken.current.has(due.key)) return;
    spoken.current.add(due.key);
    announce(due.phrase);
  }, [ride, status, names, position, origin, destination]);
}
