// C-11 Point de rencontre — suggestion backend (suggest_meeting_landmark) :
// repère ambre + marche pointillée sur carte, carte blanche « Confirmer le
// point de rencontre » / « Garder ma position ». La commande part d'ici ;
// course planifiée (C-18) → confirmation sans radar.

import { useQuery } from "@tanstack/react-query";
import { TekoMapData } from "@teko/maps";
import { color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button, PanelTitle } from "@teko/ui/native";
import { type Href, Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { TILES_URL } from "../../src/config";
import { BackChip } from "../../src/features/booking/back-chip";
import { LandmarkMarker, WalkLine } from "../../src/features/booking/booking-map-layers";
import { MeetingSheetContent } from "../../src/features/booking/meeting-sheet";
import { useBookingStore } from "../../src/features/booking/store";
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
  const setMeeting = useBookingStore((s) => s.setMeeting);
  const reset = useBookingStore((s) => s.reset);
  const mode = useResolvedMapMode();
  const { request, busy, errorMessage, scheduledConfirmed } = useRequestRide();

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
    if (suggestion) setMeeting(suggestion);
    request();
  };
  const orderKeepPosition = () => {
    setMeeting(null);
    request();
  };
  const backHome = () => {
    reset();
    router.replace("/(main)/home" as Href);
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

      {scheduledConfirmed ? (
        <BottomPanel style={sheetStyle}>
          <PanelTitle>{t("booking:rencontre.planifieeTitre")}</PanelTitle>
          <Text style={styles.scheduledText}>{t("booking:rencontre.planifieeTexte")}</Text>
          <Button
            label={t("booking:rencontre.retourAccueil")}
            onPress={backHome}
            testID="scheduled-home"
          />
        </BottomPanel>
      ) : (
        <BottomPanel style={sheetStyle}>
          <MeetingSheetContent
            pending={suggestionQuery.isPending}
            suggestion={suggestion}
            busy={busy}
            errorMessage={errorMessage}
            onConfirm={orderWithSuggestion}
            onKeepPosition={orderKeepPosition}
          />
        </BottomPanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
  scheduledText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: color.neutral[500],
    marginBottom: spacing[4],
  },
});
