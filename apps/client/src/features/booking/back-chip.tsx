// Bouton retour flottant des écrans carte (C-10/C-11) — pastille blanche
// 44 px, ombre douce, posée sous la barre de statut.

import { color } from "@teko/ui";
import { BackIcon } from "@teko/ui/native";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function BackChip({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      testID="back-chip"
      style={[styles.chip, { top: insets.top + 12 }]}
    >
      <BackIcon />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
