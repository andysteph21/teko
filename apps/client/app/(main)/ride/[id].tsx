// C-13/C-13b/C-14 — suivi de course (piloté par le statut backend).
// SQUELETTE : complété par le chantier « parcours C2 » du lot 3.

import { color, spacing, typography } from "@teko/ui";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function RideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Course en cours</Text>
      <Text style={styles.meta}>{id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  title: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.brand[900] },
  meta: { fontSize: typography.fontSize.xs, color: color.neutral[500] },
});
