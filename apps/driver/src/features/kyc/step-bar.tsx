// Barre d'étapes de l'inscription chauffeur (D-04→D-07) : retour, titre,
// compteur mono « n/4 » teal et progression 4 segments.

import { color, spacing, typography } from "@teko/ui";
import { BackIcon } from "@teko/ui/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

const TOTAL_STEPS = 4;

export interface StepBarProps {
  step: number;
  title: string;
  onBack?: () => void;
  testID?: string;
}

export function StepBar({ step, title, onBack, testID }: StepBarProps) {
  return (
    <View testID={testID}>
      <View style={styles.nav}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.back}
            accessibilityRole="button"
            testID={testID ? `${testID}-back` : undefined}
          >
            <BackIcon size={18} color={color.neutral[700]} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.counter}>
          {step}/{TOTAL_STEPS}
        </Text>
      </View>
      <View style={styles.progress}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={`seg-${String(i)}`} style={[styles.segment, i < step && styles.segmentOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  back: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
  },
  counter: {
    marginLeft: "auto",
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    color: color.role.driver.accentDark,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  segment: { flex: 1, height: 4, borderRadius: 9999, backgroundColor: color.neutral[200] },
  segmentOn: { backgroundColor: color.role.driver.accent },
});
