// Bandeau D-09 : identité chauffeur teal — solde du jour à gauche, GROS
// toggle En ligne / Hors ligne à droite, l'état est lisible en un coup d'œil.

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface HomeHeaderProps {
  balance: number | null;
  online: boolean;
  /** Suspendu : toggle inopérant, expliqué par le bandeau de suspension. */
  disabled: boolean;
  onToggle: (online: boolean) => void;
  topInset: number;
}

function balanceText(balance: number | null): string {
  if (balance === null) return "—";
  const formatted = formatXaf(balance);
  return balance > 0 ? `+${formatted}` : formatted;
}

export function HomeHeader({ balance, online, disabled, onToggle, topInset }: HomeHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.header, { paddingTop: topInset + spacing[3] }]}>
      <View>
        <Text style={styles.balanceLabel}>{t("work:accueil.soldeDuJour")}</Text>
        <Text style={styles.balanceAmount} testID="home-balance">
          {balanceText(balance)}
        </Text>
      </View>
      <Pressable
        style={styles.toggleZone}
        onPress={() => onToggle(!online)}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: online, disabled }}
        testID="online-toggle"
      >
        <Text style={styles.toggleLabel}>
          {online ? t("work:accueil.enLigne") : t("work:accueil.horsLigne")}
        </Text>
        <View style={[styles.track, online ? styles.trackOn : styles.trackOff]}>
          <View style={[styles.knob, online ? styles.knobOn : styles.knobOff]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: color.role.driver.accent,
    paddingHorizontal: spacing[4],
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: {
    color: color.neutral[0],
    opacity: 0.85,
    fontSize: typography.fontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: color.neutral[0],
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.lg,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  toggleZone: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  toggleLabel: { color: color.neutral[0], fontSize: typography.fontSize.sm, fontWeight: "700" },
  track: {
    width: 64,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  trackOn: { backgroundColor: color.neutral[0], alignItems: "flex-end" },
  trackOff: { backgroundColor: color.role.driver.accentDark, alignItems: "flex-start" },
  knob: { width: 28, height: 28, borderRadius: borderRadius.full },
  knobOn: { backgroundColor: color.role.driver.accent },
  knobOff: { backgroundColor: color.neutral[0], opacity: 0.85 },
});
