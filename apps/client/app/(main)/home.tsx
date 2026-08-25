// C-07 Accueil — carte plein écran (régime éco/auto/complet résolu), cloche
// + avatar flottants, widget data (bas-gauche, au-dessus de la feuille),
// feuille « Où allez-vous ? » : recherche de repère, récents, planifier.

import type { LonLat } from "@teko/maps";
import { color, spacing, typography } from "@teko/ui";
import {
  BellIcon,
  BottomPanel,
  CalendarIcon,
  DataWidget,
  EcoPill,
  LandmarkPinIcon,
  LandmarkRow,
  RecentIcon,
} from "@teko/ui/native";
import * as Location from "expo-location";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../src/config";
import { useProfile } from "../../src/features/auth/use-profile";
import { useBookingStore } from "../../src/features/booking/store";
import { useDataUsage, useResolvedMapMode } from "../../src/features/data/data-state";
import { ClientDot } from "../../src/features/map/client-dot";
import { TekoMapView } from "../../src/features/map/native-map";
import { useRecentDestinations } from "../../src/features/places/use-recent-destinations";

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState<LonLat | null>(null);
  const mode = useResolvedMapMode();
  const usage = useDataUsage();
  const profile = useProfile();
  const recents = useRecentDestinations();
  const setOrigin = useBookingStore((s) => s.setOrigin);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (loc && !cancelled) {
        const p = { lon: loc.coords.longitude, lat: loc.coords.latitude };
        setPosition(p);
        setOrigin({ position: p, label: "Ma position" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setOrigin]);

  const initial = (profile.data?.full_name ?? "•").trim().charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      <TekoMapView
        options={{ tilesUrl: TILES_URL, eco: mode.mode === "eco" }}
        center={position ?? DEFAULT_CENTER}
        zoom={14.2}
      >
        <ClientDot position={position} />
      </TekoMapView>

      <FloatingChips topInset={insets.top} initial={initial} />

      <View style={styles.widgetStack} pointerEvents="box-none">
        {mode.mode === "eco" ? <EcoPill /> : null}
        <DataWidget
          quantityText={usage.quantityText}
          state={usage.state}
          onPress={() => router.push("/(main)/data-settings" as Href)}
          testID="data-widget"
        />
      </View>

      <BottomPanel title={t("booking:home.ouAllezVous")} style={styles.panel}>
        <Pressable
          style={styles.search}
          onPress={() => router.push("/(main)/search" as Href)}
          accessibilityRole="button"
          testID="home-search"
        >
          <LandmarkPinIcon />
          <Text style={styles.searchText}>{t("booking:home.chercherRepere")}</Text>
        </Pressable>
        {recents.slice(0, 2).map((r) => (
          <LandmarkRow
            key={r.id}
            title={r.label}
            subtitle={`${t("booking:home.recent")} · ${r.when}`}
            icon={<RecentIcon />}
            onPress={() => router.push("/(main)/search" as Href)}
          />
        ))}
        <LandmarkRow
          title={t("booking:home.planifier")}
          subtitle={t("booking:home.planifierSous")}
          icon={<CalendarIcon />}
          iconBackground={color.neutral[100]}
          onPress={() => router.push("/(main)/schedule" as Href)}
        />
      </BottomPanel>
    </View>
  );
}

function FloatingChips({ topInset, initial }: { topInset: number; initial: string }) {
  const router = useRouter();
  return (
    <>
      <Pressable
        style={[styles.chip, { top: topInset + spacing[3], right: 70 }]}
        onPress={() => router.push("/(main)/notifications" as Href)}
        accessibilityLabel="Notifications"
      >
        <BellIcon />
      </Pressable>
      <Pressable
        style={[styles.chip, { top: topInset + spacing[3], right: spacing[4] }]}
        onPress={() => router.push("/(main)/profile" as Href)}
        accessibilityLabel="Profil"
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  chip: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarText: { color: color.brand[800], fontWeight: "700", fontSize: typography.fontSize.md },
  widgetStack: {
    position: "absolute",
    left: spacing[4],
    bottom: 282,
    gap: spacing[2],
  },
  panel: { position: "absolute", left: 0, right: 0, bottom: 0 },
  search: {
    height: spacing[12],
    borderRadius: 12,
    backgroundColor: color.neutral[100],
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: spacing[1],
  },
  searchText: { color: color.neutral[400], fontSize: typography.fontSize.md },
});
