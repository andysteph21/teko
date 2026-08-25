// Écran de validation M1 (« les 3 apps démarrent et lisent des données
// réelles ») — remplacé par C-01 Splash + parcours A au lot 3.

import { color, spacing, typography } from "@teko/ui";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../src/features/auth/use-session";
import { DataProbe } from "../src/features/m1/data-probe";
import { PhoneLogin } from "../src/features/m1/phone-login";

export default function Home() {
  const { session, loading } = useSession();

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.brand}>Teko</Text>
      <Text style={styles.subtitle}>Validation M1 — socle du lot 1</Text>
      {loading ? (
        <ActivityIndicator color={color.brand[800]} />
      ) : session ? (
        <DataProbe category="eco" />
      ) : (
        <PhoneLogin />
      )}
      <View style={styles.spacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    padding: spacing[4],
    gap: spacing[4],
  },
  brand: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: "900",
    color: color.brand[800],
    marginTop: spacing[4],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
  },
  spacer: { flex: 1 },
});
