// D-20 Historique des courses — en-tête teal avec filtres Toutes /
// Terminées / Annulées, courses groupées par jour (total brut du jour en
// tête de section), montant brut + sous-ligne « commission déduite au
// solde » (le net par course n'est pas en base — TODO dans ride-display).
//
// Écart maquette assumé : pas de barre d'onglets (portée par l'accueil
// D-09), pas de prénom du passager ni de note donnée (pas de jointure
// profil côté RLS), montants bruts au lieu du net (TODO backend).

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { listMyRides } from "@teko/api-client";
import type { RideRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DaySectionHeader,
  DriverRideRow,
  EmptyState,
  HeaderPill,
} from "../../src/features/account/history-parts";
import {
  type DaySection,
  type DriverRideFilter,
  groupRidesByDay,
  matchesFilter,
} from "../../src/features/account/ride-display";
import { supabase } from "../../src/lib/supabase";

const FILTER_LABEL_KEYS: Record<DriverRideFilter, string> = {
  toutes: "account:historique.filtreToutes",
  terminees: "account:historique.filtreTerminees",
  annulees: "account:historique.filtreAnnulees",
};
const FILTERS = Object.keys(FILTER_LABEL_KEYS) as DriverRideFilter[];

interface HistoryStatesProps {
  query: UseQueryResult<RideRow[], Error>;
  sections: DaySection[];
}

function HistoryStates({ query, sections }: HistoryStatesProps) {
  const { t } = useTranslation();
  if (query.isPending) {
    return <ActivityIndicator style={styles.stateBox} color={color.role.driver.accent} />;
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
  if (sections.length === 0) return <EmptyState />;
  return (
    <View>
      {sections.map((section) => (
        <View key={section.key}>
          <DaySectionHeader section={section} />
          {section.rides.map((ride) => (
            <DriverRideRow key={ride.id} ride={ride} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function History() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<DriverRideFilter>("toutes");
  const [now] = useState(() => new Date());
  const query = useQuery({ queryKey: ["my-rides"], queryFn: () => listMyRides(supabase, 50) });

  const sections = useMemo(
    () =>
      groupRidesByDay(
        (query.data ?? []).filter((r) => matchesFilter(r, filter)),
        now,
      ),
    [query.data, filter, now],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 22 }]}>
        <Text style={styles.title}>{t("account:historique.titre")}</Text>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <HeaderPill
              key={f}
              label={t(FILTER_LABEL_KEYS[f])}
              active={f === filter}
              onPress={() => setFilter(f)}
              testID={`filter-${f}`}
            />
          ))}
        </View>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <HistoryStates query={query} sections={sections} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  header: {
    backgroundColor: color.role.driver.accent,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.neutral[0],
    marginBottom: 10,
  },
  filters: { flexDirection: "row", gap: spacing[2] },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  stateBox: { marginTop: spacing[10], alignItems: "center", gap: spacing[3] },
  stateText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
  },
});
