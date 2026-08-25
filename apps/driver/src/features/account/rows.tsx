// Lignes groupées des écrans compte chauffeur (maquettes D-18/D-19) :
// groupe blanc arrondi 16, filets internes, titre 14,5/600, sous-texte 11,5,
// accessoire à droite (puce, valeur, chevron ou interrupteur).

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Children, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** Intitulé de section (« Mes documents », « Données »…). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

/** Groupe blanc arrondi — insère un filet entre chaque ligne. */
export function Group({ children }: { children: ReactNode }) {
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

export interface RowProps {
  title: string;
  subtitle?: string;
  /** Accessoire à droite (StatusChip, Switch, valeur…) — chevron sinon. */
  right?: ReactNode;
  danger?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function Row({ title, subtitle, right, danger = false, onPress, testID }: RowProps) {
  const body = (
    <>
      <View style={styles.rowBody}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? <Text style={styles.chevron}>›</Text>}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" testID={testID}>
      {body}
    </Pressable>
  );
}

/** Valeur grise à droite d'une ligne (« Français », « 23 Mo / 100 Mo »). */
export function RowValue({ children, testID }: { children: string; testID?: string }) {
  return (
    <Text style={styles.value} testID={testID}>
      {children}
    </Text>
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
  rowBody: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: "600", color: color.neutral[700] },
  titleDanger: { color: color.semantic.error.default },
  subtitle: {
    fontSize: 11.5,
    color: color.neutral[500],
    marginTop: 1,
    lineHeight: 16,
  },
  value: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  chevron: { fontSize: typography.fontSize.md, color: color.neutral[300] },
});
