// C-12 Recherche chauffeur — radar magenta sur carte, annulation gratuite
// tant qu'aucun chauffeur n'est attribué. Statut suivi en temps réel
// (PositionsChannel, ADR-13) ; après 90 s sans attribution : état « aucun
// chauffeur » avec réessai ou retour accueil.

import { cancelRide, createRealtimePositionsChannel } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import type { RideStatus } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button, DataWidget, PanelTitle } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { DEFAULT_CENTER, TILES_URL } from "../../src/config";
import { LandmarkMarker } from "../../src/features/booking/booking-map-layers";
import { RadarPulse } from "../../src/features/booking/radar-pulse";
import { useBookingStore } from "../../src/features/booking/store";
import { useDataUsage, useResolvedMapMode } from "../../src/features/data/data-state";
import { TekoMapView } from "../../src/features/map/native-map";
import { supabase } from "../../src/lib/supabase";

/** Délai local avant l'état « aucun chauffeur » (repli MVP). */
export const NO_DRIVER_DELAY_MS = 90_000;

/** Statuts signifiant qu'un chauffeur est attribué → suivi de course C-13. */
const ASSIGNED: RideStatus[] = ["accepted", "enroute", "arrived", "started"];

export default function Searching() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
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
  const retryCategory = () => router.replace("/(main)/category" as Href);

  const center = draft.meeting?.position ?? draft.origin?.position ?? DEFAULT_CENTER;
  const price = draft.estimates[draft.category];
  const place = draft.meeting?.name ?? draft.origin?.label;
  const sheetPad = { paddingBottom: insets.bottom + spacing[3] };
  const sheetStyle = StyleSheet.flatten([styles.sheet, sheetPad]);
  const sheetStyleCenter = StyleSheet.flatten([styles.sheet, styles.sheetCenter, sheetPad]);

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

      {noDriver ? (
        <BottomPanel style={sheetStyle}>
          <PanelTitle>{t("booking:recherche.aucunChauffeur")}</PanelTitle>
          <Text style={styles.avg}>{t("booking:recherche.aucunChauffeurTexte")}</Text>
          <Button label={t("commun.reessayer")} onPress={retryCategory} testID="retry-category" />
          <View style={styles.gap} />
          <Button
            label={t("booking:recherche.retourAccueil")}
            onPress={() => void cancelAndGoHome()}
            variant="ghost"
            busy={cancelling}
            testID="no-driver-home"
          />
        </BottomPanel>
      ) : (
        <BottomPanel style={sheetStyleCenter}>
          <View style={styles.dots}>
            <View style={[styles.dot, { backgroundColor: color.brand[100] }]} />
            <View style={[styles.dot, { backgroundColor: color.brand[400] }]} />
            <View style={[styles.dot, { backgroundColor: color.brand[500] }]} />
          </View>
          <PanelTitle>{t("booking:recherche.titre")}</PanelTitle>
          <Text style={styles.sub}>
            {t(`booking:categories.${draft.category}`)}
            {price != null ? (
              <Text>
                {" · "}
                <Text style={styles.mono}>{formatXaf(price, "FCFA")}</Text>
              </Text>
            ) : null}
            {place ? ` · ${place}` : null}
          </Text>
          <Text style={styles.avg}>{t("booking:recherche.moyenne")}</Text>
          <Text style={styles.free}>{t("booking:recherche.annulationGratuite")}</Text>
          <Button
            label={t("booking:recherche.annuler")}
            onPress={() => void cancelAndGoHome()}
            variant="danger"
            busy={cancelling}
            testID="cancel-ride"
          />
        </BottomPanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  widget: { position: "absolute", left: spacing[4], bottom: 306 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheetCenter: { alignItems: "center" },
  dots: { flexDirection: "row", gap: spacing[2], marginBottom: spacing[3] },
  dot: { width: 10, height: 10, borderRadius: 9999 },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[1],
  },
  mono: {
    fontFamily: typography.fontFamily.mono,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  avg: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[400],
    textAlign: "center",
    marginBottom: spacing[4],
  },
  free: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.success.dark,
    backgroundColor: color.semantic.success.light,
    borderRadius: 12,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    textAlign: "center",
    marginBottom: spacing[4],
    alignSelf: "stretch",
  },
  gap: { height: spacing[2] },
});
