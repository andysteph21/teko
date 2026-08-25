// Lignes de réglages groupées (maquette C-23) : médaillon 34, libellé 15/500,
// valeur ou chevron à droite, filet entre les lignes d'un même groupe.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Children, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** Intitulé de section (« Mon compte », « Préférences »…). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

/** Groupe blanc arrondi — insère un filet entre chaque ligne. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: liste statique de lignes
        <View key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export interface SettingsRowProps {
  label: string;
  icon: ReactNode;
  /** Fond du médaillon (brand-50 par défaut). */
  iconBackground?: string;
  /** Valeur affichée à droite (sinon chevron). */
  value?: string;
  danger?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function SettingsRow({
  label,
  icon,
  iconBackground = color.brand[50],
  value,
  danger = false,
  onPress,
  testID,
}: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" testID={testID}>
      <View style={[styles.medallion, { backgroundColor: iconBackground }]}>{icon}</View>
      <Text style={[styles.label, danger && styles.labelDanger]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
    marginTop: spacing[3],
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  group: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: color.neutral[100] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  medallion: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: "500",
    color: color.neutral[700],
  },
  labelDanger: { color: color.semantic.error.default },
  value: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  chevron: { fontSize: typography.fontSize.md, color: color.neutral[300] },
});
