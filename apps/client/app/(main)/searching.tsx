// C-12 Recherche chauffeur — radar magenta sur carte, annulation gratuite
// tant qu'aucun chauffeur n'est attribué. Statut suivi en temps réel
// (PositionsChannel, ADR-13) ; après 90 s sans attribution : état « aucun
// chauffeur » avec réessai ou retour accueil.

import { cancelRide, createRealtimePositionsChannel } from "@teko/api-client";
import type { RideStatus } from "@teko/types";
import { color, spacing } from "@teko/ui";
import { BottomPanel, DataWidget } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { DEFAULT_CENTER, TILES_URL } from "../../src/config";
import { LandmarkMarker } from "../../src/features/booking/booking-map-layers";
import { RadarPulse } from "../../src/features/booking/radar-pulse";
import {
  NoDriverSheetContent,
  SearchingSheetContent,
} from "../../src/features/booking/searching-sheet";
import { useBookingStore } from "../../src/features/booking/store";
import { useDataUsage, useResolvedMapMode } from "../../src/features/data/data-state";
import { TekoMapView } from "../../src/features/map/native-map";
import { supabase } from "../../src/lib/supabase";

/** Délai local avant l'état « aucun chauffeur » (repli MVP). */
export const NO_DRIVER_DELAY_MS = 90_000;

/** Statuts signifiant qu'un chauffeur est attribué → suivi de course C-13. */
const ASSIGNED: RideStatus[] = ["accepted", "enroute", "arrived", "started"];

/** Dès l'attribution (statut temps réel), bascule vers le suivi C-13. */
function useAssignmentRedirect(rideId: string | undefined, router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    if (!rideId) return;
    const channel = createRealtimePositionsChannel(supabase);
    const unsubscribe = channel.subscribeRideStatus(rideId, (status) => {
      if (ASSIGNED.includes(status)) {
        router.replace({ pathname: "/(main)/ride/[id]", params: { id: rideId } } as Href);
      }
    });
    return () => {
      void unsubscribe();
    };
  }, [rideId, router]);
}

export default function Searching() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useBookingStore(
    useShallow((s) => ({
      category: s.category,
      estimates: s.estimates,
      meeting: s.meeting,
      origin: s.origin,
    })),
  );
  const reset = useBookingStore((s) => s.reset);
  const mode = useResolvedMapMode();
  const usage = useDataUsage();
  const [noDriver, setNoDriver] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  useAssignmentRedirect(rideId, router);

  useEffect(() => {
    // TODO: brancher la notification `no_driver_found` quand le push FCM
    // arrivera — le minuteur local de 90 s est le repli MVP.
    const timer = setTimeout(() => setNoDriver(true), NO_DRIVER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const cancelAndGoHome = async () => {
    setCancelling(true);
    if (rideId) await cancelRide(supabase, rideId).catch(() => undefined);
    reset();
    router.replace("/(main)/home" as Href);
  };

  const center = draft.meeting?.position ?? draft.origin?.position ?? DEFAULT_CENTER;
  const sheetStyle = StyleSheet.flatten([
    styles.sheet,
    { paddingBottom: insets.bottom + spacing[3] },
  ]);

  return (
    <View style={styles.screen}>
      <TekoMapView
        options={{ tilesUrl: TILES_URL, eco: mode.mode === "eco" }}
        center={center}
        zoom={14.6}
      >
        <LandmarkMarker position={center} />
      </TekoMapView>
      <RadarPulse />
      <View style={styles.widget}>
        <DataWidget
          quantityText={usage.quantityText}
          state={usage.state}
          onPress={() => router.push("/(main)/data-settings" as Href)}
          testID="data-widget"
        />
      </View>

      <BottomPanel style={sheetStyle}>
        {noDriver ? (
          <NoDriverSheetContent
            cancelling={cancelling}
            onRetry={() => router.replace("/(main)/category" as Href)}
            onHome={() => void cancelAndGoHome()}
          />
        ) : (
          <SearchingSheetContent
            category={draft.category}
            price={draft.estimates[draft.category]}
            place={draft.meeting?.name ?? draft.origin?.label}
            cancelling={cancelling}
            onCancel={() => void cancelAndGoHome()}
          />
        )}
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  widget: { position: "absolute", left: spacing[4], bottom: 306 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
