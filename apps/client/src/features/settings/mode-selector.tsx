// Sélecteur du régime carte (C-25) : trois états Éco / Auto / Complet
// (préférence useMapModeStore) + état résolu affiché dessous, style
// 08-carte-langage (« Auto → éco » + raison telle quelle du résolveur).

import type { MapModePreference } from "@teko/maps";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMapModeStore, useResolvedMapMode } from "../data/data-state";

const ORDER: MapModePreference[] = ["eco", "auto", "complet"];

export function MapModeSelector() {
  const { t } = useTranslation();
  const preference = useMapModeStore((s) => s.preference);
  const setPreference = useMapModeStore((s) => s.setPreference);
  const resolved = useResolvedMapMode();

  const labels: Record<MapModePreference, string> = {
    eco: t("settings:donnees.eco"),
    auto: t("settings:donnees.auto"),
    complet: t("settings:donnees.complet"),
  };
  const resolvedLabel = resolved.mode === "eco" ? labels.eco.toLowerCase() : "complet";

  return (
    <View>
      <View accessibilityRole="radiogroup" style={styles.pills}>
        {ORDER.map((value) => {
          const active = preference === value;
          return (
            <Pressable
              key={value}
              onPress={() => setPreference(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.pill, active && styles.pillActive]}
              testID={`mode-${value}`}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {labels[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.resolved} testID="mode-resolved">
        {t("settings:donnees.resolu", { pref: labels[preference], mode: resolvedLabel })}
        <Text style={styles.reason}> · {resolved.raison}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: "row", gap: spacing[2] },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    backgroundColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  pillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[500],
  },
  pillTextActive: { color: color.brand[800] },
  resolved: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[600],
  },
  reason: { fontWeight: "400", color: color.neutral[400] },
});
