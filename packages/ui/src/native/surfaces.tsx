// Surfaces : carte blanche (rayon 12-16, ombre md) et panneau bas d'écran
// carte (rayon 20 en haut, poignée) — la « sheet » des maquettes C-07→C-14.

import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { borderRadius, color, spacing, typography } from "../tokens";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export interface BottomPanelProps {
  children: ReactNode;
  title?: string;
  /** Poignée de préhension (écrans carte). */
  handle?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/** Panneau ancré en bas (au-dessus de la carte) — rayon 20 haut, ombre.
 * Ancré à bottom:0 en edge-to-edge : l'appelant doit réserver l'inset bas
 * (`paddingBottom: insets.bottom + spacing[5]`), sinon la dernière ligne
 * passe sous la barre système (zone tactile morte, vécu OPPO A15). */
export function BottomPanel({ children, title, handle = true, style, testID }: BottomPanelProps) {
  return (
    <View style={[styles.panel, style]} testID={testID}>
      {handle ? <View style={styles.handle} /> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing[5],
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  panel: {
    backgroundColor: color.neutral[0],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[5],
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[200],
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
    marginBottom: spacing[3],
  },
});
