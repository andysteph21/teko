// D-01 Splash chauffeur — routage par l'état du compte : pas de fiche
// chauffeur → parcours G (inscription/KYC) ; dossier en attente/à corriger
// → D-08 ; validé → accueil ; course active → suivi direct.

import { findActiveRide, getMyDriver } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSession } from "../src/features/auth/use-session";
import { supabase } from "../src/lib/supabase";

export default function Splash() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/(auth)/onboarding" as Href);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const driver = await getMyDriver(supabase, session.user.id);
        if (cancelled) return;
        if (!driver) {
          router.replace("/(auth)/identity" as Href);
          return;
        }
        if (driver.kyc_status !== "validated") {
          router.replace("/(auth)/verification" as Href);
          return;
        }
        const ride = await findActiveRide(supabase);
        if (cancelled) return;
        if (ride) router.replace(`/(main)/ride/${ride.id}` as Href);
        else router.replace("/(main)/home" as Href);
      } catch {
        if (!cancelled) router.replace("/(main)/home" as Href);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, session, router]);

  return (
    <View style={styles.screen}>
      <View style={styles.mark}>
        <Text style={styles.markText}>T</Text>
      </View>
      <Text style={styles.brand}>Teko Chauffeur</Text>
      <Text style={styles.slogan}>Vos gains, réglés chaque jour</Text>
      <ActivityIndicator color={color.neutral[0]} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.brand[800],
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    borderWidth: 5,
    borderColor: color.role.driver.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  markText: { color: color.neutral[0], fontSize: 48, fontWeight: "900" },
  brand: { color: color.neutral[0], fontSize: typography.fontSize["2xl"], fontWeight: "900" },
  slogan: { color: color.role.driver.accentLight, fontSize: typography.fontSize.base, marginTop: spacing[1] },
  spinner: { marginTop: spacing[8] },
});
