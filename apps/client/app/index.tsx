// C-01 Splash — marque + routage de session (parcours A/B) : session valide
// → accueil (< 3 s sur 3G) ; course active côté serveur → JAMAIS l'accueil
// vide, directement le suivi ; sans session → onboarding.

import { findActiveRide, restoreAccountIfDeletionPending, touchLastSeen } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useSession } from "../src/features/auth/use-session";
import { supabase } from "../src/lib/supabase";

export default function Splash() {
  const { session, loading } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/(auth)/onboarding");
      return;
    }
    let cancelled = false;
    void touchLastSeen(supabase).catch(() => undefined);
    // Parcours F : revenir pendant la fenêtre de 30 j rétracte la demande de
    // suppression — confirmé par Alert, retenté à la prochaine ouverture si
    // le réseau lâche (d'où le catch silencieux, comme touchLastSeen).
    void restoreAccountIfDeletionPending(supabase, session.user.id)
      .then((restored) => {
        if (restored) {
          Alert.alert(
            t("account:suppression.restaureTitre"),
            t("account:suppression.restaureTexte"),
          );
        }
      })
      .catch(() => undefined);
    findActiveRide(supabase)
      .then((ride) => {
        if (cancelled) return;
        if (ride) router.replace({ pathname: "/(main)/ride/[id]", params: { id: ride.id } });
        else router.replace("/(main)/home");
      })
      .catch(() => {
        if (!cancelled) router.replace("/(main)/home");
      });
    return () => {
      cancelled = true;
    };
  }, [loading, session, router, t]);

  return (
    <View style={styles.screen}>
      <View style={styles.mark}>
        <Text style={styles.markText}>T</Text>
      </View>
      <Text style={styles.brand}>Teko</Text>
      <Text style={styles.slogan}>{t("account:splash.slogan")}</Text>
      <ActivityIndicator color={color.neutral[0]} style={styles.spinner} />
      <Text style={styles.version}>{t("account:splash.version")}</Text>
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
    borderColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  markText: { color: color.neutral[0], fontSize: 48, fontWeight: "900" },
  brand: { color: color.neutral[0], fontSize: typography.fontSize["2xl"], fontWeight: "900" },
  slogan: { color: color.brand[100], fontSize: typography.fontSize.base, marginTop: spacing[1] },
  spinner: { marginTop: spacing[8] },
  version: {
    position: "absolute",
    bottom: spacing[8],
    color: color.brand[200],
    fontSize: typography.fontSize.xs,
  },
});
