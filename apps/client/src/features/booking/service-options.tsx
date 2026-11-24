// Options de service de l'accueil (C-07, retour du 20 novembre 2026) : les
// catégories actives sont proposées dès le premier écran. Une option non
// ouverte n'est jamais affichée ; la liste suit CATEGORIES.

import type { VehicleCategory } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { CarIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORIES } from "./use-estimates";

export interface ServiceOptionsProps {
  selected: VehicleCategory;
  onSelect: (category: VehicleCategory) => void;
}

export function ServiceOptions({ selected, onSelect }: ServiceOptionsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" testID="home-services">
      {CATEGORIES.map((category) => {
        const active = category === selected;
        return (
          <Pressable
            key={category}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSelect(category)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            testID={`home-service-${category}`}
          >
            <CarIcon />
            <Text style={[styles.label, active && styles.labelActive]}>
              {t(`booking:categories.${category}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[2], marginBottom: spacing[3] },
  option: {
    flex: 1,
    minHeight: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    backgroundColor: color.neutral[0],
  },
  optionActive: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: "600",
    color: color.neutral[700],
  },
  labelActive: { color: color.brand[800] },
});
