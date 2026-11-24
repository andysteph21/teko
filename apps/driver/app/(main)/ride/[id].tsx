// D-11 → D-14b — écran maître du parcours H côté chauffeur, piloté par le
// statut backend : accepted/enroute (vers le passager), arrived (attente +
// PIN D-12), started (vers la destination + positions 5 s), completed
// (encaissement espèces D-14 ou Airtel D-14b).
//
// Par-dessus : demande de modification de trajet (lot R3), offre d'un
// passager supplémentaire pendant un covoiturage (lot R4 — une course par
// passager, l'écran en affiche une à la fois) et remise d'une livraison par
// photo et code (lot R5).

import { driverBalance } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSession } from "../../../src/features/auth/use-session";
import { ActiveRideView } from "../../../src/features/work/active-ride-view";
import { AirtelPanel } from "../../../src/features/work/airtel-panel";
import { CompletePanel } from "../../../src/features/work/complete-panel";
import { useResolvedMapMode } from "../../../src/features/work/data-state";
import { DeliveryHandoff } from "../../../src/features/work/delivery-handoff";
import { DeliveryDonePanel } from "../../../src/features/work/delivery-panels";
import { OfferModal } from "../../../src/features/work/offer-modal";
import { PinPanel } from "../../../src/features/work/pin-panel";
import { isActiveStatus, isDelivery } from "../../../src/features/work/ride-kind";
import { RouteChangeModal } from "../../../src/features/work/route-change-modal";
import { type DriverRide, useDriverRide } from "../../../src/features/work/use-driver-ride";
import { usePushPositions } from "../../../src/features/work/use-push-positions";
import { type RideActions, useRideActions } from "../../../src/features/work/use-ride-actions";
import { type RideExtras, useRideExtras } from "../../../src/features/work/use-ride-extras";
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

/** Saisie plein écran ouverte par-dessus la carte. */
type Entry = "none" | "pin" | "handoff";

interface ContentProps {
  state: DriverRide;
  actions: RideActions;
  extras: RideExtras;
  eco: boolean;
}

/** Fin de course : remise faite (livraison), espèces D-14 ou Airtel D-14b. */
function CompletedView({ state, actions }: ContentProps) {
  const ride = state.ride;
  const delivery = isDelivery(ride);
  const cash = ride?.payment_method !== "airtel";
  const newBalance = useNewBalance(cash && !delivery);
  if (!ride) return null;
  if (delivery) return <DeliveryDonePanel ride={ride} onDone={actions.cashDone} />;
  if (!cash) return <AirtelPanel ride={ride} />;
  return <CompletePanel ride={ride} newBalance={newBalance} onDone={actions.cashDone} />;
}

function RideContent(props: ContentProps) {
  const { state, actions, extras, eco } = props;
  const [entry, setEntry] = useState<Entry>("none");
  const { ride, status } = state;
  const back = () => setEntry("none");

  if (!ride) return <LoadingView loadError={state.loadError} onRetry={state.reload} />;
  if (status === "completed") return <CompletedView {...props} />;
  if (entry === "pin" && status === "arrived") {
    return (
      <PinPanel
        busy={actions.busy}
        error={actions.pinError}
        fails={actions.pinFails}
        onSubmit={actions.start}
        onClearError={actions.clearPinError}
        onBack={back}
        delivery={isDelivery(ride)}
      />
    );
  }
  if (entry === "handoff" && status === "started" && isDelivery(ride)) {
    return <DeliveryHandoff delivery={extras.delivery} onBack={back} />;
  }
  return (
    <ActiveRideView
      state={state}
      actions={actions}
      extras={extras}
      eco={eco}
      onRequestPin={() => setEntry("pin")}
      onHandoff={() => setEntry("handoff")}
    />
  );
}

/** Fenêtres à échéance par-dessus l'écran, quelle que soit la vue affichée. */
function RideOverlays({ extras }: { extras: RideExtras }) {
  const { routeChange, feed } = extras;
  return (
    <>
      {routeChange.pending ? (
        <RouteChangeModal
          change={routeChange.pending}
          destinationName={routeChange.destinationName}
          busy={routeChange.busy}
          onAccept={routeChange.accept}
          onRefuse={routeChange.refuse}
          onExpire={routeChange.expire}
        />
      ) : null}
      {feed.offer ? (
        <OfferModal
          offer={feed.offer}
          busy={feed.busy}
          onAccept={feed.accept}
          onDecline={feed.decline}
          onExpire={feed.expire}
        />
      ) : null}
    </>
  );
}

function RideScreen({ id }: { id: string }) {
  const state = useDriverRide(id);
  const actions = useRideActions(id, state.applyRide, state.leave);
  const extras = useRideExtras(state);
  const eco = useResolvedMapMode().mode === "eco";
  const { status } = state;
  // Covoiturage : une course close ne coupe pas le suivi tant qu'un autre
  // passager est à bord ou attendu — le serveur recopie la position envoyée
  // pour une course vers les autres courses du trajet.
  const active = isActiveStatus(status);
  const other = active ? null : extras.shared.otherActiveId;
  usePushPositions(other ?? id, status ? active || other !== null : undefined, eco);

  return (
    <View style={styles.root}>
      <RideContent state={state} actions={actions} extras={extras} eco={eco} />
      <RideOverlays extras={extras} />
    </View>
  );
}

export default function DriverRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Une course par passager : changer de course repart d'un état neuf.
  return <RideScreen key={id} id={id} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    padding: spacing[5],
  },
  loadError: { fontSize: typography.fontSize.base, color: color.neutral[500] },
});
