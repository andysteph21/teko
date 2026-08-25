// Puces d'état & badge MVP (maquettes components) — l'état est porté par le
// LIBELLÉ, la couleur ne fait que l'appuyer.

import { StyleSheet, Text, View } from "react-native";
import { borderRadius, color, typography } from "../tokens";

export type StatusChipTone = "ok" | "cancel" | "scheduled" | "pending" | "neutral";

const TONES: Record<StatusChipTone, { bg: string; fg: string }> = {
  ok: { bg: color.semantic.success.light, fg: color.semantic.success.dark },
  cancel: { bg: color.semantic.error.light, fg: color.semantic.error.dark },
  scheduled: { bg: color.semantic.info.light, fg: color.semantic.info.dark },
  pending: { bg: color.semantic.warning.light, fg: color.semantic.warning.dark },
  neutral: { bg: color.neutral[100], fg: color.neutral[500] },
};

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: StatusChipTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.chipText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Badge ambre des éléments transitoires (repli e-mail OTP…). */
export function MvpBadge() {
  return (
    <View style={[styles.chip, styles.mvp]}>
      <Text style={styles.mvpText}>MVP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: typography.fontSize.xs, fontWeight: "700" },
  mvp: { backgroundColor: color.semantic.warning.light, paddingHorizontal: 8, paddingVertical: 2 },
  mvpText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.semantic.warning.dark,
  },
});
