// D-01 Splash chauffeur — routage par l'état du compte : pas de fiche
// chauffeur → parcours G (inscription/KYC) ; dossier en attente/à corriger
// → D-08 ; validé → accueil ; course active → suivi direct.

import type { TekoClient } from "@teko/api-client";
import { findActiveRide, getMyDriver } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSession } from "../src/features/auth/use-session";
import { supabase } from "../src/lib/supabase";

/** Décide l'écran d'entrée d'après l'état du compte (fiche → KYC → course). */
async function resolveEntryRoute(client: TekoClient, userId: string): Promise<Href> {
  try {
    const driver = await getMyDriver(client, userId);
    if (!driver) return "/(auth)/identity" as Href;
    if (driver.kyc_status !== "validated") return "/(auth)/verification" as Href;
    const ride = await findActiveRide(client);
    return (ride ? `/(main)/ride/${ride.id}` : "/(main)/home") as Href;
  } catch {
    return "/(main)/home" as Href;
  }
}

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
    void resolveEntryRoute(supabase, session.user.id).then((route) => {
      if (!cancelled) router.replace(route);
    });
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
  slogan: {
    color: color.role.driver.accentLight,
    fontSize: typography.fontSize.base,
    marginTop: spacing[1],
  },
  spinner: { marginTop: spacing[8] },
});
