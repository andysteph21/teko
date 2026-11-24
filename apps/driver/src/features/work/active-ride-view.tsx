// Vue carte du parcours course (D-11 → D-13) : itinéraire, repères, bannière
// d'état et feuille basse selon le statut backend et la nature de la course
// (classique avec arrêts, covoiturage avec ses passagers, livraison).

import type { LonLat } from "@teko/maps";
import type { RideRow, RideStatus } from "@teko/types";
import { color, spacing } from "@teko/ui";
import { DataWidget, EcoPill } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../config";
import { TekoMapView } from "../map/native-map";
import { CoursePanel } from "./course-panel";
import { useDataUsage } from "./data-state";
import { DeliveryPanel, ParcelCard } from "./delivery-panels";
import {
  ClientPin,
  DestinationDot,
  MeetingPin,
  RouteLine,
  StopDots,
  VehicleDot,
} from "./map-layers";
import { PassengerPanel } from "./passenger-panel";
import { RideBanner } from "./ride-banner";
import { isDelivery } from "./ride-kind";
import { SharedPassengers } from "./shared-passengers";
import { rideHref } from "./shared-rides";
import { StopsSection } from "./stops-section";
import { WorkToast } from "./toast";
import { useClientPosition } from "./use-client-position";
import { useDevicePosition } from "./use-device-position";
import type { DriverRide } from "./use-driver-ride";
import { useLivePosition } from "./use-live-position";
import type { RideActions } from "./use-ride-actions";
import { useRideAnnouncements } from "./use-ride-announcements";
import type { RideExtras } from "./use-ride-extras";

export interface ActiveRideViewProps {
  state: DriverRide;
  actions: RideActions;
  extras: RideExtras;
  eco: boolean;
  onRequestPin: () => void;
  /** Livraison : ouvre la remise (photo puis code du destinataire). */
  onHandoff: () => void;
}

/** Phase d'approche : rencontre visible, destination cachée (anti-écrémage). */
function isPickup(status: RideStatus): boolean {
  return status === "accepted" || status === "enroute" || status === "arrived";
}

function ActiveBanner(props: {
  ride: RideRow;
  status: RideStatus;
  onHeight: (height: number) => void;
}) {
  const { ride, status, onHeight } = props;
  const insets = useSafeAreaInsets();
  if (status === "requested") return null;
  const banner = status === "started" ? "started" : status === "arrived" ? "arrived" : "enroute";
  return (
    <RideBanner
      status={banner}
      originHint={ride.origin_hint}
      destHint={ride.dest_hint}
      topInset={insets.top}
      onHeight={onHeight}
    />
  );
}

function StartedPanel({ state, actions, extras, onHandoff }: ActiveRideViewProps) {
  const router = useRouter();
  const ride = state.ride;
  if (!ride) return null;
  if (isDelivery(ride)) {
    return <DeliveryPanel parcel={extras.delivery.parcel} onHandoff={onHandoff} />;
  }
  return (
    <CoursePanel
      ride={ride}
      busy={actions.busy}
      onComplete={actions.complete}
      header={
        <SharedPassengers
          shared={extras.shared}
          onSelect={(rideId) => router.replace(rideHref(rideId))}
        />
      }
      stops={<StopsSection stops={extras.stops} />}
      completeBlocked={extras.stops.current !== null}
    />
  );
}

function ActivePanel(props: ActiveRideViewProps) {
  const { state, actions, extras, onRequestPin } = props;
  const router = useRouter();
  const ride = state.ride;
  const status = state.status;
  if (!ride || !status) return null;
  if (status === "started") return <StartedPanel {...props} />;
  if (!isPickup(status)) return null;
  const delivery = isDelivery(ride);
  return (
    <PassengerPanel
      status={status === "arrived" ? "arrived" : "enroute"}
      originHint={ride.origin_hint}
      arrivedAt={status === "arrived" ? ride.updated_at : null}
      busy={actions.busy}
      onArrive={actions.arrive}
      onRequestPin={onRequestPin}
      onNoShow={actions.noShow}
      delivery={delivery}
      header={
        delivery ? (
          <ParcelCard ride={ride} parcel={extras.delivery.parcel} />
        ) : (
          <SharedPassengers
            shared={extras.shared}
            onSelect={(rideId) => router.replace(rideHref(rideId))}
          />
        )
      }
    />
  );
}

/** Arrêts pas encore quittés : à montrer sur la carte pendant la course. */
function pendingStops(extras: RideExtras, status: RideStatus): LonLat[] {
  if (status !== "started") return [];
  return extras.stops.stops.filter((stop) => !stop.leftAt).map((stop) => stop.position);
}

export function ActiveRideView(props: ActiveRideViewProps) {
  const { state, extras, eco } = props;
  const router = useRouter();
  const usage = useDataUsage();
  const [bannerHeight, setBannerHeight] = useState(0);
  const devicePosition = useDevicePosition();
  useLivePosition(true);
  const clientPosition = useClientPosition(state.ride?.id, state.status);
  useRideAnnouncements({
    ride: state.ride,
    status: state.status,
    origin: state.origin,
    destination: state.destination,
    position: devicePosition,
  });
  const ride = state.ride;
  const status = state.status;
  if (!ride || !status) return null;
  // Après une modification acceptée, le tracé du devis (arrêts compris)
  // remplace celui de la course.
  const route =
    status === "started" && extras.routeChange.route ? extras.routeChange.route : state.routeCoords;

  return (
    <View style={styles.screen}>
      <View style={styles.mapZone}>
        <TekoMapView
          options={{ tilesUrl: TILES_URL, eco }}
          center={state.origin ?? DEFAULT_CENTER}
          zoom={14.5}
          recenter={devicePosition}
        >
          <RouteLine coordinates={route} />
          <MeetingPin position={isPickup(status) ? state.origin : null} />
          <ClientPin position={clientPosition} />
          <StopDots positions={pendingStops(extras, status)} />
          <DestinationDot position={state.destination} />
          <VehicleDot position={devicePosition} />
        </TekoMapView>
        <View
          style={[styles.widgetStack, { top: bannerHeight + spacing[3] }]}
          pointerEvents="box-none"
        >
          {eco ? <EcoPill /> : null}
          <DataWidget
            quantityText={usage.quantityText}
            state={usage.state}
            onPress={() => router.push("/(main)/settings" as Href)}
            testID="data-widget"
          />
        </View>
      </View>
      <ActiveBanner ride={ride} status={status} onHeight={setBannerHeight} />
      <ActivePanel {...props} />
      <WorkToast />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  mapZone: { flex: 1 },
  // Sous la bannière, en haut de la carte : ni le panneau du bas ni la
  // barre système ne peuvent le recouvrir, quelle que soit leur hauteur
  // (retour terrain du 16 novembre 2026, contrôle OPPO A15 du 17).
  widgetStack: {
    position: "absolute",
    left: spacing[4],
    gap: spacing[2],
  },
});
