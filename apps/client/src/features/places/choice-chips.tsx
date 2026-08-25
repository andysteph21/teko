// Puces de choix (maquettes C-09 et C-26) : pilule 34-36, fond neutre au
// repos, brand-50 + bordure magenta quand sélectionnée. Sélection exclusive.

import { borderRadius, color, typography } from "@teko/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface ChoiceChipOption<V extends string> {
  value: V;
  label: string;
}

export interface ChoiceChipsProps<V extends string> {
  options: readonly ChoiceChipOption<V>[];
  selected: V | null;
  onSelect: (value: V) => void;
  testIDPrefix?: string;
}

export function ChoiceChips<V extends string>({
  options,
  selected,
  onSelect,
  testIDPrefix,
}: ChoiceChipsProps<V>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const on = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 36,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.neutral[100],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipOn: { backgroundColor: color.brand[50], borderColor: color.brand[500] },
  label: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[600] },
  labelOn: { color: color.brand[800] },
});
