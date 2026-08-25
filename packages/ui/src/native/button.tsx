// Boutons (maquette components/boutons.html) : hauteur 48, rayon 20, texte
// md 17/600. UN SEUL bouton principal par écran. Pressé : opacité 0,88 +
// scale 0,97. Désactivé : jamais masqué — expliquer ce qui manque à côté.

import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, color, spacing, typography } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  /** Pill 36 px (filtres, catégories compactes). */
  pill?: boolean;
  /** Accent chauffeur (teal) pour les CTA de l'app chauffeur. */
  accent?: "brand" | "driver";
  icon?: ReactNode;
  testID?: string;
}

const GRADIENT = [color.brand[800], color.brand[500]] as const;

const BG_COLORS: Record<ButtonVariant, string> = {
  primary: "transparent",
  secondary: color.brand[50],
  ghost: "transparent",
  danger: color.semantic.error.light,
};

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: color.neutral[0],
  secondary: color.brand[800],
  ghost: color.brand[800],
  danger: color.semantic.error.default,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  pill = false,
  accent = "brand",
  icon,
  testID,
}: ButtonProps) {
  const isPrimary = variant === "primary" && !disabled;
  const radius = pill ? borderRadius.full : borderRadius.xl;
  const textColor = disabled ? color.neutral[400] : TEXT_COLORS[variant];
  const spinnerColor = variant === "primary" ? color.neutral[0] : color.brand[800];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy }}
      style={({ pressed }) => [
        styles.base,
        { height: pill ? 36 : spacing[12], borderRadius: radius },
        pill && styles.pill,
        !isPrimary && { backgroundColor: disabled ? color.neutral[200] : BG_COLORS[variant] },
        pressed && styles.pressed,
      ]}
    >
      {isPrimary && accent === "brand" ? (
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: radius }]}
        />
      ) : null}
      {isPrimary && accent === "driver" ? (
        <View
          style={[styles.fill, { backgroundColor: color.role.driver.accent, borderRadius: radius }]}
        />
      ) : null}
      {icon}
      {busy ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.label, pill && styles.labelPill, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing[2],
    overflow: "hidden",
  },
  fill: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 },
  pill: { width: undefined, paddingHorizontal: spacing[4], alignSelf: "flex-start" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  label: { fontSize: typography.fontSize.md, fontWeight: "600" },
  labelPill: { fontSize: typography.fontSize.sm },
});
