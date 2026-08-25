// C-09 Affinage — carte centrée sur la destination (zoom ~16), épingle
// ambre, panneau : libellé, indication + puces-préfixes, CTA Continuer
// → setDestinationHint puis C-10 catégorie.
//
// TODO(affinage-pin) : glisser fin de l'épingle. TekoMapView (features/map)
// n'expose pas encore onRegionDidChange/getCenter de MapLibre RN — quand il
// le fera, recentrer la destination sur le centre carte au repos (map idle).

import { borderRadius, color, spacing } from "@teko/ui";
import { BackIcon, BottomPanel } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TILES_URL } from "../../src/config";
import { useBookingStore } from "../../src/features/booking/store";
import { useResolvedMapMode } from "../../src/features/data/data-state";
import { TekoMapView } from "../../src/features/map/native-map";
import { DestinationPin } from "../../src/features/places/destination-pin";
import { RefinePanel } from "../../src/features/places/refine-panel";

export default function Refine() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mode = useResolvedMapMode();
  const destination = useBookingStore((s) => s.destination);
  const setDestinationHint = useBookingStore((s) => s.setDestinationHint);
  const [hint, setHint] = useState(destination?.hint ?? "");

  useEffect(() => {
    if (!destination) router.replace("/(main)/search" as Href);
  }, [destination, router]);
  if (!destination) return null;

  const onContinue = () => {
    setDestinationHint(hint.trim());
    router.push("/(main)/category" as Href);
  };

  return (
    <View style={styles.screen}>
      <TekoMapView
        options={{ tilesUrl: TILES_URL, eco: mode.mode === "eco" }}
        center={destination.position}
        zoom={16}
      >
        <DestinationPin position={destination.position} />
      </TekoMapView>

      <Pressable
        onPress={() => router.back()}
        style={[styles.back, { top: insets.top + spacing[3] }]}
        accessibilityRole="button"
        accessibilityLabel={t("places:affinage.retour")}
        testID="refine-back"
      >
        <BackIcon size={18} />
      </Pressable>

      <BottomPanel style={{ ...styles.panel, paddingBottom: insets.bottom + spacing[5] }}>
        <RefinePanel
          label={destination.label}
          hint={hint}
          onChangeHint={setHint}
          onContinue={onContinue}
        />
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  back: {
    position: "absolute",
    left: spacing[4],
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  panel: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
