// D-11 → D-14b — écran maître du parcours H côté chauffeur, piloté par le
// statut backend : accepted/enroute (vers le passager), arrived (attente +
// PIN D-12), started (vers la destination + positions 5 s), completed
// (encaissement espèces D-14 ou Airtel D-14b).

import { driverBalance } from "@teko/api-client";
import type { RideRow, RideStatus } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { Button, DataWidget, EcoPill } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../../src/config";
import { useSession } from "../../../src/features/auth/use-session";
import { TekoMapView } from "../../../src/features/map/native-map";
import { AirtelPanel } from "../../../src/features/work/airtel-panel";
import { CompletePanel } from "../../../src/features/work/complete-panel";
import { CoursePanel } from "../../../src/features/work/course-panel";
import { useDataUsage, useResolvedMapMode } from "../../../src/features/work/data-state";
import {
  DestinationDot,
  MeetingPin,
  RouteLine,
  VehicleDot,
} from "../../../src/features/work/map-layers";
import { PassengerPanel } from "../../../src/features/work/passenger-panel";
import { PinPanel } from "../../../src/features/work/pin-panel";
import { RideBanner } from "../../../src/features/work/ride-banner";
import { WorkToast } from "../../../src/features/work/toast";
import { useDevicePosition } from "../../../src/features/work/use-device-position";
import { type DriverRide, useDriverRide } from "../../../src/features/work/use-driver-ride";
import { usePushPositions } from "../../../src/features/work/use-push-positions";
import { type RideActions, useRideActions } from "../../../src/features/work/use-ride-actions";
import { supabase } from "../../../src/lib/supabase";

/** Solde du jour rafraîchi après clôture (ligne « nouveau solde » de D-14). */
function useNewBalance(enabled: boolean): number | null {
  const { session } = useSession();
  const userId = session?.user.id;
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    driverBalance(supabase, userId)
      .then((amount) => {
        if (!cancelled) setBalance(amount);
      })
      .catch(() => {
        // Solde indisponible : la ligne est simplement omise.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);
  return balance;
}

function LoadingView({ loadError, onRetry }: { loadError: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.loading}>
      {loadError ? (
        <>
          <Text style={styles.loadError}>{t("work:course.chargementErreur")}</Text>
          <Button
            label={t("commun.reessayer")}
            variant="secondary"
            onPress={onRetry}
            testID="ride-retry"
          />
        </>
      ) : (
        <ActivityIndicator color={color.role.driver.accentDark} />
      )}
    </View>
  );
}

interface ActiveViewProps {
  state: DriverRide;
  actions: RideActions;
  eco: boolean;
  onRequestPin: () => void;
}

/** Phase d'approche : rencontre visible, destination cachée (anti-écrémage). */
function isPickup(status: RideStatus): boolean {
  return status === "accepted" || status === "enroute" || status === "arrived";
}

function ActiveBanner({ ride, status }: { ride: RideRow; status: RideStatus }) {
  const insets = useSafeAreaInsets();
  if (status === "requested") return null;
  const banner = status === "started" ? "started" : status === "arrived" ? "arrived" : "enroute";
  return (
    <RideBanner
      status={banner}
      originHint={ride.origin_hint}
      destHint={ride.dest_hint}
      topInset={insets.top}
    />
  );
}

function ActivePanel({ state, actions, onRequestPin }: Omit<ActiveViewProps, "eco">) {
  const ride = state.ride;
  const status = state.status;
  if (!ride || !status) return null;
  if (status === "started") {
    return <CoursePanel ride={ride} busy={actions.busy} onComplete={actions.complete} />;
  }
  if (!isPickup(status)) return null;
  return (
    <PassengerPanel
      status={status === "arrived" ? "arrived" : "enroute"}
      originHint={ride.origin_hint}
      arrivedAt={status === "arrived" ? ride.updated_at : null}
      busy={actions.busy}
      onArrive={actions.arrive}
      onRequestPin={onRequestPin}
      onNoShow={actions.noShow}
    />
  );
}

function ActiveRideView({ state, actions, eco, onRequestPin }: ActiveViewProps) {
  const router = useRouter();
  const usage = useDataUsage();
  const devicePosition = useDevicePosition();
  const ride = state.ride;
  const status = state.status;
  if (!ride || !status) return null;

  return (
    <View style={styles.screen}>
      <TekoMapView
        options={{ tilesUrl: TILES_URL, eco }}
        center={state.origin ?? DEFAULT_CENTER}
        zoom={14.5}
      >
        <RouteLine coordinates={state.routeCoords} />
        <MeetingPin position={isPickup(status) ? state.origin : null} />
        <DestinationDot position={state.destination} />
        <VehicleDot position={devicePosition} />
      </TekoMapView>
      <ActiveBanner ride={ride} status={status} />
      <View style={styles.widgetStack} pointerEvents="box-none">
        {eco ? <EcoPill /> : null}
        <DataWidget
          quantityText={usage.quantityText}
          state={usage.state}
          onPress={() => router.push("/(main)/settings" as Href)}
          testID="data-widget"
        />
      </View>
      <ActivePanel state={state} actions={actions} onRequestPin={onRequestPin} />
      <WorkToast />
    </View>
  );
}

export default function DriverRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useDriverRide(id);
  const actions = useRideActions(id, state.applyRide);
  const [pinMode, setPinMode] = useState(false);
  const mode = useResolvedMapMode();
  const eco = mode.mode === "eco";
  const { ride, status } = state;
  usePushPositions(id, status === "started", eco);
  const cash = ride?.payment_method !== "airtel";
  const newBalance = useNewBalance(status === "completed" && cash);

  if (!ride) return <LoadingView loadError={state.loadError} onRetry={state.reload} />;
  if (status === "completed") {
    return cash ? (
      <CompletePanel ride={ride} newBalance={newBalance} onDone={actions.cashDone} />
    ) : (
      <AirtelPanel ride={ride} />
    );
  }
  if (pinMode && status === "arrived") {
    return (
      <PinPanel
        busy={actions.busy}
        error={actions.pinError}
        fails={actions.pinFails}
        onSubmit={actions.start}
        onClearError={actions.clearPinError}
        onBack={() => setPinMode(false)}
      />
    );
  }
  return (
    <ActiveRideView
      state={state}
      actions={actions}
      eco={eco}
      onRequestPin={() => setPinMode(true)}
    />
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
  widgetStack: {
    position: "absolute",
    left: spacing[4],
    bottom: 196,
    gap: spacing[2],
  },
});
