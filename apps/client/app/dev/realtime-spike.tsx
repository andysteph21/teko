// SPIKE lot 1 — Realtime en arrière-plan / écran verrouillé (06-demarrage §2).
// S'abonne aux positions de la dernière course du compte et journalise chaque
// événement (écran + logcat via console.log, préfixe [spike-rt]). Protocole
// côté hôte : tools/spikes/README.md. Route DEV uniquement.

import {
  createRealtimePositionsChannel,
  listMyRides,
  type RidePositionEvent,
  type Unsubscribe,
} from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../src/lib/supabase";

interface SpikeEvent {
  seq: number;
  recordedAt: string;
  arrivedAtMs: number;
  latencyMs: number;
}

export default function RealtimeSpike() {
  const [rideId, setRideId] = useState<string | null>(null);
  const [events, setEvents] = useState<SpikeEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        const rides = await listMyRides(supabase, 1);
        const ride = rides[0];
        if (!ride || cancelled) {
          setError(ride ? null : "Aucune course sur ce compte — lancer tools/spikes d'abord.");
          return;
        }
        setRideId(ride.id);
        console.log(`[spike-rt] subscribe ride=${ride.id} at=${Date.now()}`);
        const channel = createRealtimePositionsChannel(supabase);
        unsubscribe = channel.subscribeRidePositions(ride.id, (e: RidePositionEvent) => {
          seq.current += 1;
          const arrivedAtMs = Date.now();
          const latencyMs = arrivedAtMs - Date.parse(e.recordedAt);
          console.log(
            `[spike-rt] seq=${seq.current} recorded_at=${e.recordedAt} arrived=${arrivedAtMs} latency_ms=${latencyMs}`,
          );
          setEvents((prev) =>
            [{ seq: seq.current, recordedAt: e.recordedAt, arrivedAtMs, latencyMs }, ...prev].slice(
              0,
              20,
            ),
          );
        });
      } catch {
        setError("Abonnement impossible (session ? stack locale ?)");
      }
    };
    void start();

    return () => {
      cancelled = true;
      void unsubscribe?.();
    };
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Spike Realtime — positions de course</Text>
      <Text style={styles.meta}>course : {rideId ?? "recherche…"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.list}>
        {events.map((e) => (
          <Text key={e.seq} style={styles.line}>
            #{e.seq} · {e.recordedAt.slice(11, 19)} · latence {e.latencyMs} ms
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[900], padding: spacing[4], gap: spacing[2] },
  title: {
    color: color.neutral[0],
    fontSize: typography.fontSize.md,
    fontWeight: "700",
    marginTop: spacing[10],
  },
  meta: { color: color.neutral[400], fontSize: typography.fontSize.xs },
  error: { color: "#F08787", fontSize: typography.fontSize.sm },
  list: { flex: 1, marginTop: spacing[2] },
  line: {
    color: "#4ADE94",
    fontSize: typography.fontSize.sm,
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
});
