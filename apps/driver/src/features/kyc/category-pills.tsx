// Multi-sélection des catégories exercées (D-04) — pastilles Éco / Moto /
// Confort, accent teal chauffeur. Le covoiturage n'est pas au MVP.

import type { VehicleCategory } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

const CHOICES = [
  { category: "eco", labelKey: "kyc:identite.catEco" },
  { category: "moto", labelKey: "kyc:identite.catMoto" },
  { category: "confort", labelKey: "kyc:identite.catConfort" },
] as const;

export interface CategoryPillsProps {
  selected: readonly VehicleCategory[];
  onToggle: (category: VehicleCategory) => void;
}

export function CategoryPills({ selected, onToggle }: CategoryPillsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {CHOICES.map(({ category, labelKey }) => {
        const on = selected.includes(category);
        return (
          <Pressable
            key={category}
            onPress={() => onToggle(category)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            testID={`category-${category}`}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{t(labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[2] },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    backgroundColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
  },
  pillOn: {
    borderColor: color.role.driver.accent,
    backgroundColor: color.role.driver.accentLight,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[600],
  },
  labelOn: { color: color.role.driver.accentDark },
});
