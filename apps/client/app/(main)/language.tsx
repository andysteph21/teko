// C-30 Langue — français seul au MVP (ADR-08) : structure prête pour
// d'autres langues, lignes « Bientôt » grisées, note d'ouverture.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckIcon } from "../../src/features/settings/icons";
import { ScreenHeader } from "../../src/features/settings/screen-header";

interface LanguageRowProps {
  title: string;
  subtitle: string;
  selected?: boolean;
  soonLabel?: string;
  testID?: string;
}

function LanguageRow({ title, subtitle, selected = false, soonLabel, testID }: LanguageRowProps) {
  return (
    <View
      style={[styles.row, selected && styles.rowOn, !selected && styles.rowSoon]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !selected }}
      testID={testID}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {selected ? (
        <View style={styles.check}>
          <CheckIcon size={12} color={color.neutral[0]} strokeWidth={3} />
        </View>
      ) : (
        <Text style={styles.soonBadge}>{soonLabel}</Text>
      )}
    </View>
  );
}

export default function Language() {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("settings:langue.titre")} />
      <ScrollView contentContainerStyle={styles.content} accessibilityRole="radiogroup">
        <LanguageRow
          title={t("settings:langue.francais")}
          subtitle={t("settings:langue.actuelle")}
          selected
          testID="lang-fr"
        />
        <LanguageRow
          title={t("settings:langue.english")}
          subtitle={t("settings:langue.englishSous")}
          soonLabel={t("settings:langue.bientot")}
          testID="lang-en"
        />
        <LanguageRow
          title={t("settings:langue.locales")}
          subtitle={t("settings:langue.localesSous")}
          soonLabel={t("settings:langue.bientot")}
          testID="lang-locales"
        />
        <Text style={styles.note}>{t("settings:langue.note")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { padding: spacing[5], gap: spacing[2] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    paddingHorizontal: spacing[4],
  },
  rowOn: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  rowSoon: { opacity: 0.55 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  rowSubtitle: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  check: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[500],
    alignItems: "center",
    justifyContent: "center",
  },
  soonBadge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wide,
    color: color.neutral[500],
    backgroundColor: color.neutral[100],
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: 9,
    overflow: "hidden",
  },
  note: {
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
    color: color.neutral[500],
    backgroundColor: color.neutral[100],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: 14,
    marginTop: spacing[2],
  },
});
