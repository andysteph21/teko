// C-13 / C-13b / C-14 — écran maître du parcours C2 : suivi de course piloté
// par le statut backend (accepted/enroute → arrived → started), carte vivante
// (véhicule temps réel, itinéraire violet), PIN de prise en charge, partage,
// SOS. completed → paiement ; cancelled_driver → information + accueil.

import type { LonLat } from "@teko/maps";
import { color, spacing, typography } from "@teko/ui";
import { Button, DataWidget, EcoPill } from "@teko/ui/native";
import * as Location from "expo-location";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../../src/config";
import { useBookingStore } from "../../../src/features/booking/store";
import { useDataUsage, useResolvedMapMode } from "../../../src/features/data/data-state";
import { ClientDot } from "../../../src/features/map/client-dot";
import { TekoMapView } from "../../../src/features/map/native-map";
import {
  DestinationFlag,
  OriginPin,
  RouteLine,
  VehicleMarker,
} from "../../../src/features/ride/ride-map-layers";
import { RidePanel } from "../../../src/features/ride/ride-panel";
import { useRideTracking } from "../../../src/features/ride/use-ride-tracking";
import { useShareTrip } from "../../../src/features/ride/use-share-trip";

/** Position de l'appareil (point client magenta) — meilleure volonté, une fois. */
function useDevicePosition(): LonLat | null {
  const [position, setPosition] = useState<LonLat | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (loc && !cancelled) setPosition({ lon: loc.coords.longitude, lat: loc.coords.latitude });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return position;
}

function LoadingView({ loadError, onRetry }: { loadError: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.loading}>
      {loadError ? (
        <>
          <Text style={styles.loadError}>{t("ride:suivi.chargementErreur")}</Text>
          <Button
            label={t("commun.reessayer")}
            variant="secondary"
            onPress={onRetry}
            testID="ride-retry"
          />
        </>
      ) : (
        <ActivityIndicator color={color.brand[800]} />
      )}
    </View>
  );
}

export default function RideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tracking = useRideTracking(id);
  const mode = useResolvedMapMode();
  const usage = useDataUsage();
  const devicePosition = useDevicePosition();
  const bookingDestination = useBookingStore((s) => s.destination);
  const { sharing, share } = useShareTrip(id);

  const { ride } = tracking;
  if (!ride) return <LoadingView loadError={tracking.loadError} onRetry={tracking.reload} />;

  return (
    <View style={styles.screen}>
      <TekoMapView
        options={{ tilesUrl: TILES_URL, eco: mode.mode === "eco" }}
        center={tracking.origin ?? DEFAULT_CENTER}
        zoom={14.5}
      >
        <RouteLine coordinates={tracking.routeCoords} />
        <OriginPin position={tracking.origin} />
        <DestinationFlag position={tracking.destination} />
        <ClientDot position={devicePosition} />
        <VehicleMarker position={tracking.vehicle} />
      </TekoMapView>

      <Pressable
        style={[styles.sosFab, { top: insets.top + spacing[3] }]}
        onPress={() => router.push(`/(main)/sos?rideId=${ride.id}` as Href)}
        accessibilityRole="button"
        accessibilityLabel={t("ride:suivi.sos")}
        testID="ride-sos"
      >
        <Text style={styles.sosFabText}>{t("ride:suivi.sos")}</Text>
      </Pressable>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.widgetStack} pointerEvents="box-none">
          {mode.mode === "eco" ? <EcoPill /> : null}
          <DataWidget
            quantityText={usage.quantityText}
            state={usage.state}
            onPress={() => router.push("/(main)/data-settings" as Href)}
            testID="data-widget"
          />
        </View>
        <RidePanel
          tracking={tracking}
          ride={ride}
          destinationLabel={bookingDestination?.label ?? null}
          sharing={sharing}
          onShare={() => void share()}
          onCancel={() => router.push(`/(main)/cancel/${ride.id}` as Href)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  loading: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    padding: spacing[5],
  },
  loadError: { fontSize: typography.fontSize.base, color: color.neutral[500] },
  sosFab: {
    position: "absolute",
    right: spacing[4],
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: color.semantic.error.default,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: color.semantic.error.default,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  sosFabText: {
    color: color.neutral[0],
    fontSize: typography.fontSize.sm,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  widgetStack: {
    alignSelf: "flex-start",
    marginLeft: spacing[4],
    marginBottom: spacing[2],
    gap: spacing[2],
  },
});
