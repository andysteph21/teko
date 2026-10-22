// C-11 Point de rencontre — suggestion backend (suggest_meeting_landmark) :
// repère ambre + marche pointillée sur carte, carte blanche « Confirmer le
// point de rencontre » / « Garder ma position ». Un déplacement du départ
// présente un nouveau devis à confirmer avant la commande immédiate cash.

import { useQuery } from "@tanstack/react-query";
import { TekoMapData } from "@teko/maps";
import { color, spacing } from "@teko/ui";
import { BottomPanel } from "@teko/ui/native";
import { type Href, Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { TILES_URL } from "../../src/config";
import { BackChip } from "../../src/features/booking/back-chip";
import { LandmarkMarker, WalkLine } from "../../src/features/booking/booking-map-layers";
import { MeetingSheetContent } from "../../src/features/booking/meeting-sheet";
import { PickupPriceConfirmation } from "../../src/features/booking/pickup-price-confirmation";
import { useBookingStore } from "../../src/features/booking/store";
import { usePickupConfirmation } from "../../src/features/booking/use-pickup-confirmation";
import { useRequestRide } from "../../src/features/booking/use-request-ride";
import { useResolvedMapMode } from "../../src/features/data/data-state";
import { ClientDot } from "../../src/features/map/client-dot";
import { TekoMapView } from "../../src/features/map/native-map";
import { supabase } from "../../src/lib/supabase";

export default function Meeting() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { origin, destination } = useBookingStore(
    useShallow((s) => ({ origin: s.origin, destination: s.destination })),
  );
  const mode = useResolvedMapMode();
  const { request, busy, errorMessage } = useRequestRide();
  const pickup = usePickupConfirmation(request);

  const suggestionQuery = useQuery({
    queryKey: ["meeting-suggestion", origin?.position.lon, origin?.position.lat],
    enabled: Boolean(origin),
    staleTime: 60_000,
    queryFn: () => {
      if (!origin) throw new Error("origine absente");
      return new TekoMapData(supabase).suggestMeetingLandmark(origin.position);
    },
  });

  if (!origin || !destination) return <Redirect href={"/(main)/home" as Href} />;

  const suggestion = suggestionQuery.data ?? null;
  const orderWithSuggestion = () => {
    pickup.choose(suggestion);
  };
  const orderKeepPosition = () => {
    pickup.choose(null);
  };
  const sheetStyle = StyleSheet.flatten([
    styles.sheet,
    { paddingBottom: insets.bottom + spacing[3] },
  ]);

  return (
    <View style={styles.screen}>
      <TekoMapView
        options={{ tilesUrl: TILES_URL, eco: mode.mode === "eco" }}
        center={origin.position}
        zoom={15}
      >
        <WalkLine from={origin.position} to={suggestion?.position ?? null} />
        <ClientDot position={origin.position} />
        <LandmarkMarker position={suggestion?.position ?? null} />
      </TekoMapView>
      <BackChip onPress={() => router.back()} />

      <BottomPanel style={sheetStyle}>
        {pickup.pending ? (
          <PickupPriceConfirmation
            value={pickup.pending}
            previousPrice={pickup.previousPrice}
            busy={busy || pickup.busy}
            errorMessage={errorMessage ?? (pickup.failed ? t("erreurs.generique") : null)}
            onConfirm={pickup.confirm}
            onCancel={pickup.cancel}
          />
        ) : (
          <MeetingSheetContent
            pending={suggestionQuery.isPending}
            suggestion={suggestion}
            busy={busy || pickup.busy}
            errorMessage={errorMessage ?? (pickup.failed ? t("erreurs.generique") : null)}
            onConfirm={orderWithSuggestion}
            onKeepPosition={orderKeepPosition}
          />
        )}
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
