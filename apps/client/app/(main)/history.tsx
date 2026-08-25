// C-19 Historique — courses du compte groupées par jour (À venir /
// Aujourd'hui / Hier / date), filtres en pastilles ; montant précédé de ≈
// tant que le prix n'est pas final ; tap → détail C-20.

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { listMyRides } from "@teko/api-client";
import type { RideRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterPill } from "../../src/features/history/filter-pill";
import { HistoryList } from "../../src/features/history/history-list";
import {
  groupRides,
  matchesFilter,
  type RideFilter,
  type RideSection,
} from "../../src/features/history/ride-display";
import { ScreenHeader } from "../../src/features/history/screen-header";
import { supabase } from "../../src/lib/supabase";

const FILTER_LABEL_KEYS: Record<RideFilter, string> = {
  toutes: "history:liste.filtreToutes",
  aVenir: "history:liste.filtreAVenir",
  terminees: "history:liste.filtreTerminees",
  annulees: "history:liste.filtreAnnulees",
};
const FILTERS = Object.keys(FILTER_LABEL_KEYS) as RideFilter[];

interface HistoryStatesProps {
  query: UseQueryResult<RideRow[], Error>;
  sections: RideSection[];
  now: Date;
  onPressRide: (ride: RideRow) => void;
}

function HistoryStates({ query, sections, now, onPressRide }: HistoryStatesProps) {
  const { t } = useTranslation();
  if (query.isPending) {
    return <ActivityIndicator style={styles.stateBox} color={color.brand[500]} />;
  }
  if (query.isError) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateText}>{t("erreurs.generique")}</Text>
        <Button
          label={t("commun.reessayer")}
          variant="secondary"
          onPress={() => void query.refetch()}
          testID="history-retry"
        />
      </View>
    );
  }
  if (sections.length === 0) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.emptyTitle}>{t("history:liste.videTitre")}</Text>
        <Text style={styles.stateText}>{t("history:liste.videTexte")}</Text>
      </View>
    );
  }
  return <HistoryList sections={sections} now={now} onPressRide={onPressRide} />;
}

export default function History() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<RideFilter>("toutes");
  const [now] = useState(() => new Date());
  const query = useQuery({ queryKey: ["my-rides"], queryFn: () => listMyRides(supabase, 50) });

  const sections = useMemo(
    () =>
      groupRides(
        (query.data ?? []).filter((r) => matchesFilter(r, filter, now)),
        now,
      ),
    [query.data, filter, now],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title={t("history:liste.titre")} />
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <FilterPill
            key={f}
            label={t(FILTER_LABEL_KEYS[f])}
            active={f === filter}
            onPress={() => setFilter(f)}
            testID={`filter-${f}`}
          />
        ))}
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <HistoryStates
          query={query}
          sections={sections}
          now={now}
          onPressRide={(ride) => router.push(`/(main)/history/${ride.id}` as Href)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  filters: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  stateBox: { marginTop: spacing[10], alignItems: "center", gap: spacing[3] },
  stateText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
  },
  emptyTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
});
