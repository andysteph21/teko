// Sonde M1 : prouve la chaîne complète app → @teko/api-client → RPC backend
// (repères seed de Libreville + estimation tarifaire) — jalon « les apps
// lisent des données réelles ». Remplacée par les vrais écrans au lot 3.

import { useQuery } from "@tanstack/react-query";
import { estimatePrice, signOut } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { TekoMapData } from "@teko/maps";
import type { VehicleCategory } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

const MONT_BOUET = { lon: 9.4536, lat: 0.4032 };

interface ProbeProps {
  category: VehicleCategory;
}

export function DataProbe({ category }: ProbeProps) {
  const { t } = useTranslation();
  const probe = useQuery({
    queryKey: ["m1-probe", category],
    queryFn: async () => {
      const maps = new TekoMapData(supabase);
      const [landmarks, price] = await Promise.all([
        maps.nearestLandmarks(MONT_BOUET, { maxM: 3000, limit: 5 }),
        estimatePrice(supabase, { category, distanceM: 3190, durationS: 318 }),
      ]);
      return { landmarks, price };
    },
  });

  if (probe.isPending) return <ActivityIndicator color={color.brand[800]} />;
  if (probe.isError) {
    return (
      <View style={styles.card}>
        <Text style={styles.error}>{t("erreurs.generique")}</Text>
        <Pressable onPress={() => probe.refetch()}>
          <Text style={styles.link}>{t("commun.reessayer")}</Text>
        </Pressable>
      </View>
    );
  }

  const names = probe.data.landmarks.features.map(
    (f) => (f.properties as { name?: string }).name ?? "?",
  );
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Repères autour de Mont-Bouët</Text>
      {names.map((name) => (
        <Text key={name} style={styles.item}>
          {name}
        </Text>
      ))}
      <Text style={styles.title}>Estimation 3,19 km / 5 min ({category})</Text>
      <Text style={styles.amount}>{formatXaf(probe.data.price)}</Text>
      <Pressable onPress={() => signOut(supabase)}>
        <Text style={styles.link}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing[6],
    gap: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.neutral[500],
    marginTop: spacing[2],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  item: {
    fontSize: typography.fontSize.md,
    color: color.neutral[700],
  },
  amount: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: "900",
    color: color.brand[900],
    fontVariant: ["tabular-nums"],
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.base,
  },
  link: {
    color: color.brand[500],
    fontSize: typography.fontSize.base,
    fontWeight: "600",
    marginTop: spacing[2],
  },
});
