// Morceaux de l'historique D-20 : pastille de filtre sur en-tête teal,
// ligne de course (colonne départ → arrivée, puce d'état, montant brut +
// sous-ligne commission), tête de section par jour, état vide.

import type { RideRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { StatusChip } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  type DaySection,
  rideAmount,
  rideChip,
  rideHint,
  rideTitle,
  sectionTitle,
  sectionTotalText,
} from "./ride-display";

export interface HeaderPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

/** Pastille de filtre sur fond teal : active = blanche, texte teal foncé. */
export function HeaderPill({ label, active, onPress, testID }: HeaderPillProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Ligne de course D-20 — montant brut, sous-ligne commission si terminée. */
export function DriverRideRow({ ride }: { ride: RideRow }) {
  const { t } = useTranslation();
  const chip = rideChip(ride);
  const amount = rideAmount(ride);
  const title =
    rideTitle(ride) ??
    t("account:historique.course", { categorie: t(`account:categorie.${ride.category}`) });
  return (
    <View style={styles.row} testID={`ride-${ride.id}`}>
      <View style={styles.dotColumn}>
        <View style={[styles.dot, { backgroundColor: color.map.markerClient }]} />
        <View style={styles.dotLine} />
        <View style={[styles.dot, { backgroundColor: color.map.markerLandmark }]} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.hint}>{rideHint(ride, t)}</Text>
      </View>
      <View style={styles.right}>
        <StatusChip label={t(chip.labelKey)} tone={chip.tone} />
        <Text style={styles.amount}>{amount.text}</Text>
        {amount.showCommission ? (
          <Text style={styles.commission}>{t("account:historique.commission")}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** « Aujourd'hui · 9 courses      +13 520 F » — tête de section. */
export function DaySectionHeader({ section }: { section: DaySection }) {
  const { t } = useTranslation();
  const total = sectionTotalText(section);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sectionTitle(section, t)}</Text>
      {total ? <Text style={styles.sectionTotal}>{total}</Text> : null}
    </View>
  );
}

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{t("account:historique.videTitre")}</Text>
      <Text style={styles.emptyText}>{t("account:historique.videTexte")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 32,
    borderRadius: 9999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  pillActive: { backgroundColor: color.neutral[0] },
  pillText: { fontSize: 12.5, fontWeight: "700", color: color.neutral[0] },
  pillTextActive: { color: color.role.driver.accentDark },
  row: {
    flexDirection: "row",
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: color.neutral[100],
    alignItems: "flex-start",
  },
  dotColumn: { alignItems: "center", paddingTop: 5, alignSelf: "stretch" },
  dot: { width: 8, height: 8, borderRadius: 9999 },
  dotLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: color.neutral[200],
    marginVertical: 2,
  },
  rowBody: { flex: 1 },
  title: { fontSize: typography.fontSize.sm + 1, fontWeight: "600", color: color.neutral[700] },
  hint: { fontSize: 12, color: color.neutral[500], marginTop: 1 },
  right: { alignItems: "flex-end", gap: 4 },
  amount: {
    fontSize: typography.fontSize.sm + 1,
    fontWeight: "700",
    color: color.semantic.success.dark,
    fontVariant: ["tabular-nums"],
  },
  commission: { fontSize: 10, fontWeight: "600", color: color.neutral[400] },
  section: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
  },
  sectionTotal: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    color: color.semantic.success.dark,
    fontVariant: ["tabular-nums"],
  },
  empty: { marginTop: spacing[10], alignItems: "center", gap: spacing[2] },
  emptyTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
  },
});
