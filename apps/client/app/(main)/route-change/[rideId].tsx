// Modifier le trajet en cours de course (R3) : nouvelle destination, 0 à 2
// arrêts, devis serveur (jamais inférieur au prix accepté), confirmation,
// puis attente de la réponse du chauffeur (30 s). Refus ou silence : la
// course continue inchangée.

import { useQuery } from "@tanstack/react-query";
import { getRide } from "@teko/api-client";
import { type GeomInput, toLonLat } from "@teko/maps";
import type { RideRow } from "@teko/types";
import { color, spacing } from "@teko/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { type PlacePick, useBookingStore } from "../../../src/features/booking/store";
import { ScreenHeader } from "../../../src/features/history/screen-header";
import { PlacePicker } from "../../../src/features/ride/place-picker";
import {
  EditView,
  ErrorText,
  OutcomeView,
  PendingView,
  type PickTarget,
  QuoteView,
} from "../../../src/features/ride/route-change-parts";
import {
  type RouteChangeController,
  useRouteChange,
} from "../../../src/features/ride/use-route-change";
import { supabase } from "../../../src/lib/supabase";

/** Destination en vigueur, proposée par défaut (ajouter un arrêt sans la changer). */
function currentDestination(ride: RideRow, label: string): PlacePick | null {
  try {
    return {
      position: toLonLat(ride.dest_geom as GeomInput),
      label: ride.dest_hint?.trim() || label,
      landmarkId: ride.dest_landmark_id ?? undefined,
    };
  } catch {
    return null;
  }
}

interface PhaseViewProps {
  change: RouteChangeController;
  onPick: (target: PickTarget) => void;
}

function PhaseView({ change, onPick }: PhaseViewProps) {
  const router = useRouter();
  if (change.phase === "edit") return <EditView change={change} onPick={onPick} />;
  if (change.phase === "quoted") return <QuoteView change={change} />;
  if (change.phase === "pending") return <PendingView secondsLeft={change.secondsLeft} />;
  return (
    <OutcomeView
      outcome={change.phase}
      newPrice={Number(change.quote?.new_price ?? 0)}
      onBack={() => router.back()}
      onRetry={change.edit}
    />
  );
}

function RouteChangeFlow({ ride }: { ride: RideRow }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draftLabel = useBookingStore((s) => s.destination?.label);
  const [initial] = useState(() =>
    currentDestination(ride, draftLabel ?? t("ride:modification.destinationActuelle")),
  );
  const change = useRouteChange(ride.id, initial);
  const [picking, setPicking] = useState<PickTarget | null>(null);
  const bottom = { paddingBottom: insets.bottom + spacing[5] };

  if (picking) {
    return (
      <View style={[styles.body, bottom]}>
        <PlacePicker
          placeholder={t(
            picking === "stop"
              ? "ride:modification.chercherArret"
              : "ride:modification.chercherDestination",
          )}
          onCancel={() => setPicking(null)}
          onPick={(place) => {
            if (picking === "stop") change.addStop(place);
            else change.setDestination(place);
            setPicking(null);
          }}
        />
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={bottom}
      keyboardShouldPersistTaps="handled"
    >
      <PhaseView change={change} onPick={setPicking} />
    </ScrollView>
  );
}

export default function RouteChangeScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { t } = useTranslation();
  const ride = useQuery({
    queryKey: ["ride", rideId, "route-change"],
    queryFn: () => getRide(supabase, rideId),
    enabled: Boolean(rideId),
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title={t("ride:modification.titre")} />
      {ride.data ? <RouteChangeFlow ride={ride.data} /> : null}
      {ride.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={color.brand[800]} />
        </View>
      ) : null}
      {ride.isError ? (
        <View style={styles.loading}>
          <ErrorText errorKey="ride:suivi.chargementErreur" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  body: { flex: 1 },
  loading: { padding: spacing[6], alignItems: "center" },
});
