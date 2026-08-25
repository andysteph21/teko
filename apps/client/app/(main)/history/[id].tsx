// C-20 Détail de course — fiche d'un trajet passé ou planifié : trajet
// (départ → arrivée), infos (chauffeur, paiement, total), reçu si terminée.
// La carte statique de la maquette viendra avec le lot carte (SKIP acté).

import { useQuery } from "@tanstack/react-query";
import { getProfile, getRide } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { StatusChip } from "@teko/ui/native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailBody } from "../../../src/features/history/detail-cards";
import { rideChip } from "../../../src/features/history/ride-display";
import { ScreenHeader } from "../../../src/features/history/screen-header";
import { supabase } from "../../../src/lib/supabase";

export default function HistoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [now] = useState(() => new Date());
  const ride = useQuery({
    queryKey: ["ride", id],
    enabled: Boolean(id),
    queryFn: () => getRide(supabase, id as string),
  });
  const driverId = ride.data?.driver_id ?? null;
  // Nom du chauffeur — meilleure-effort : si la RLS des profils ne l'expose
  // pas au client, la ligne est simplement masquée.
  const driver = useQuery({
    queryKey: ["profile", driverId],
    enabled: Boolean(driverId),
    retry: false,
    queryFn: () => getProfile(supabase, driverId as string),
  });

  if (ride.isPending) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScreenHeader title="" />
        <ActivityIndicator style={styles.state} color={color.brand[500]} />
      </SafeAreaView>
    );
  }
  if (ride.isError || !ride.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScreenHeader title="" />
        <Text style={styles.stateText}>{t("history:detail.introuvable")}</Text>
      </SafeAreaView>
    );
  }

  const chip = rideChip(ride.data, now);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader
        title={t("history:detail.titre", {
          categorie: t(`history:categorie.${ride.data.category}`),
        })}
        trailing={<StatusChip label={t(chip.labelKey)} tone={chip.tone} />}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <DetailBody ride={ride.data} driverName={driver.data?.full_name ?? null} now={now} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingTop: spacing[3], paddingBottom: spacing[6] },
  state: { marginTop: spacing[10] },
  stateText: {
    marginTop: spacing[10],
    textAlign: "center",
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
  },
});
