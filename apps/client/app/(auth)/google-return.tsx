// Retour de la connexion Google : échange le code à usage unique contre la
// session, puis reprend le parcours comme après un code par e-mail.

import { completeOAuthSignIn, getProfile } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { googleReturnUrl } from "../../src/features/auth/google-return";
import { supabase } from "../../src/lib/supabase";

export default function GoogleReturn() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const url = googleReturnUrl(params);

  useEffect(() => {
    let alive = true;
    const finish = async () => {
      const session = await completeOAuthSignIn(supabase, url);
      if (!session) throw new Error("retour sans code");
      if (!alive) return;
      const profile = await getProfile(supabase, session.user.id);
      router.replace(profile.full_name ? "/" : "/(auth)/profile-setup");
    };
    finish().catch(() => {
      if (alive) setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [url, router]);

  return (
    <SafeAreaView style={styles.screen}>
      {failed ? (
        <>
          <Text style={styles.text} testID="google-return-error">
            {t("account:email.googleRefus")}
          </Text>
          <Button
            label={t("account:email.googleRetour")}
            onPress={() => router.replace("/(auth)/email" as Href)}
            testID="google-return-back"
          />
        </>
      ) : (
        <ActivityIndicator color={color.brand[500]} testID="google-return-busy" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing[5],
    gap: spacing[4],
    justifyContent: "center",
    backgroundColor: color.neutral[50],
  },
  text: { fontSize: typography.fontSize.base, color: color.neutral[700], textAlign: "center" },
});
