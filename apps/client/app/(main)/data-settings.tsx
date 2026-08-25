// C-25 Données & mode éco — consommation du mois (gros mono + barre de
// progression vs budget 100 Mo, seuils 50/80 % rappelés), sélecteur trois
// états Éco / Auto / Complet et explication honnête du mode éco.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MapModeSelector } from "../../src/features/settings/mode-selector";
import { ScreenHeader } from "../../src/features/settings/screen-header";
import { useDataProgress } from "../../src/features/settings/use-data-progress";

export default function DataSettings() {
  const { t } = useTranslation();
  const progress = useDataProgress();
  const month = new Date().toLocaleDateString("fr-FR", { month: "long" });

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("settings:donnees.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>{t("settings:donnees.consoLabel", { mois: month })}</Text>
          <Text style={styles.qty} testID="data-used">
            {progress.usedText}{" "}
            <Text style={styles.qtySmall}>{t("settings:donnees.budgetSuffixe")}</Text>
          </Text>
          <View style={styles.bar}>
            <LinearGradient
              colors={[color.brand[800], color.brand[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${Math.max(progress.ratio * 100, 1)}%` }]}
            />
          </View>
          <Text style={styles.note}>{t("settings:donnees.seuils")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.modeTitle}>{t("settings:donnees.modeTitre")}</Text>
          <Text style={styles.modeSub}>{t("settings:donnees.modeSous")}</Text>
          <MapModeSelector />
        </View>

        <Text style={styles.what}>
          {t("settings:donnees.quoi1")}
          <Text style={styles.whatStrong}>{t("settings:donnees.quoiFort")}</Text>
          {t("settings:donnees.quoi2")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { padding: spacing[5], gap: spacing[3] },
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: 18,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
    marginBottom: spacing[2],
  },
  qty: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: "900",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  qtySmall: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[500] },
  bar: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    marginTop: spacing[3],
    marginBottom: 6,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: borderRadius.full },
  note: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  modeTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  modeSub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginTop: 1,
    marginBottom: spacing[3],
  },
  what: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: color.neutral[500],
    backgroundColor: color.neutral[100],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: 14,
  },
  whatStrong: { fontWeight: "700", color: color.neutral[700] },
});
