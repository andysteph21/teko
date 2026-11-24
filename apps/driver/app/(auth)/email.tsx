// D-03 Adresse e-mail — entrée du compte chauffeur depuis le 23 novembre 2026 : un
// code à 6 chiffres est envoyé à l'adresse, sans mot de passe. Le numéro de
// téléphone se déclare ensuite dans le profil et peut changer sans perdre
// le compte. Lien secondaire vers la connexion par numéro tant qu'elle est
// ouverte (comptes existants, option SMS future).

import { signInWithEmailOtp, TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PHONE_LOGIN_ENABLED } from "../../src/config";
import { isValidEmail } from "../../src/features/auth/otp-channel";
import { supabase } from "../../src/lib/supabase";

export default function Email() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    if (!isValidEmail(address)) {
      setError(t("kyc:email.erreurFormat"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailOtp(supabase, address);
      router.push({ pathname: "/(auth)/otp", params: { email: address } } as Href);
    } catch (e) {
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("kyc:email.erreurEnvoi"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("kyc:email.titre")}</Text>
      <Text style={styles.text}>{t("kyc:email.texte")}</Text>
      <View style={styles.form}>
        <TextField
          label={t("kyc:email.label")}
          placeholder={t("kyc:email.placeholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          error={error}
          helper={t("kyc:email.helper")}
          testID="email-input"
        />
        <Button
          label={t("kyc:email.cta")}
          onPress={() => void sendCode()}
          busy={busy}
          disabled={email.trim().length < 5}
          testID="email-send"
        />
      </View>
      {PHONE_LOGIN_ENABLED ? (
        <Pressable
          onPress={() => router.push("/(auth)/phone" as Href)}
          style={styles.alternate}
          accessibilityRole="button"
          testID="email-use-phone"
        >
          <Text style={styles.alternateText}>{t("kyc:email.avecNumero")}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing[5], backgroundColor: color.neutral[50] },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    marginTop: spacing[8],
  },
  text: {
    fontSize: typography.fontSize.base,
    color: color.neutral[500],
    marginTop: spacing[2],
    lineHeight: 22,
  },
  form: { marginTop: spacing[6], gap: spacing[4] },
  alternate: { marginTop: spacing[5], alignSelf: "center", padding: spacing[2] },
  alternateText: { color: color.brand[500], fontSize: typography.fontSize.sm, fontWeight: "600" },
});
