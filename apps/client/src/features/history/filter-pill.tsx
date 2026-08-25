// Pastille de filtre C-19 — active : dégradé de marque (mêmes stops que le
// bouton primaire du kit), inactive : fond neutre.

import { borderRadius, color, typography } from "@teko/ui";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";

export interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

const GRADIENT = [color.brand[800], color.brand[500]] as const;

export function FilterPill({ label, active, onPress, testID }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={styles.pill}
    >
      {active ? (
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      ) : null}
      <Text style={[styles.label, active ? styles.labelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 36,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.neutral[100],
    overflow: "hidden",
  },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[600],
  },
  labelActive: { color: color.neutral[0] },
});
