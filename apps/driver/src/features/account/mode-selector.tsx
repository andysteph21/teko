// Sélecteur du régime carte (D-19, patron C-25 client) : trois états
// Éco / Auto / Complet en accent chauffeur (teal) + état résolu affiché
// dessous, raison telle quelle du résolveur (08-carte-langage).

import type { MapModePreference } from "@teko/maps";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMapModeStore, useResolvedMapMode } from "./data-mode";

const ORDER: MapModePreference[] = ["eco", "auto", "complet"];

export function MapModeSelector() {
  const { t } = useTranslation();
  const preference = useMapModeStore((s) => s.preference);
  const setPreference = useMapModeStore((s) => s.setPreference);
  const resolved = useResolvedMapMode();

  const labels: Record<MapModePreference, string> = {
    eco: t("account:parametres.eco"),
    auto: t("account:parametres.auto"),
    complet: t("account:parametres.complet"),
  };
  const resolvedLabel = resolved.mode === "eco" ? labels.eco.toLowerCase() : "complet";

  return (
    <View style={styles.wrap}>
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
        {t("account:parametres.resolu", { pref: labels[preference], mode: resolvedLabel })}
        <Text style={styles.reason}> · {resolved.raison}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingBottom: 13 },
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
  pillActive: {
    borderColor: color.role.driver.accent,
    backgroundColor: color.role.driver.accentLight,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[500],
  },
  pillTextActive: { color: color.role.driver.accentDark },
  resolved: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[600],
  },
  reason: { fontWeight: "400", color: color.neutral[400] },
});
