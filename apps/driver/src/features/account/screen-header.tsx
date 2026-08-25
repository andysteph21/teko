// En-tête de navigation des écrans compte (maquette D-19) : pastille
// retour 40 + titre brand-900.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingTop: insets.top + spacing[3] }]}>
      <Pressable
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        testID="header-back"
      >
        <BackIcon />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
  },
});
