// Carte de catégorie de course (C-10) : bordure 1,5, rayon 16, sélectionnée
// = bordure magenta + fond brand-50 + coche. Prix en chasse fixe, à droite.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, color, typography } from "../tokens";

export interface CategoryCardProps {
  title: string;
  meta: string;
  priceText: string;
  icon: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function CategoryCard({
  title,
  meta,
  priceText,
  icon,
  selected = false,
  onPress,
  testID,
}: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.icon, selected && styles.iconSelected]}>{icon}</View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Text style={styles.price}>{priceText}</Text>
      {selected ? (
        <View style={styles.check}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: color.neutral[0],
  },
  cardSelected: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  icon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  iconSelected: { backgroundColor: color.neutral[0] },
  body: { flex: 1 },
  title: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  meta: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 2 },
  price: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.md,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[500],
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: color.neutral[0], fontSize: 12, fontWeight: "700" },
});
