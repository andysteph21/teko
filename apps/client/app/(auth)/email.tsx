// C-03 Adresse e-mail — entrée du compte depuis le 23 novembre 2026 : un
// code à 6 chiffres est envoyé à l'adresse, sans mot de passe. Le numéro de
// téléphone se déclare ensuite dans le profil et peut changer sans perdre
// le compte. Lien secondaire vers la connexion par numéro tant qu'elle est
// ouverte (comptes existants, option SMS future).

import { googleSignInUrl, signInWithEmailOtp, TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GOOGLE_LOGIN_ENABLED, PHONE_LOGIN_ENABLED } from "../../src/config";
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
      setError(t("account:email.erreurFormat"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailOtp(supabase, address);
      router.push({ pathname: "/(auth)/otp", params: { email: address } });
    } catch (e) {
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("account:email.erreurEnvoi"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("account:email.titre")}</Text>
      <Text style={styles.text}>{t("account:email.texte")}</Text>
      {GOOGLE_LOGIN_ENABLED ? <GoogleEntry /> : null}
      <View style={styles.form}>
        <TextField
          label={t("account:email.label")}
          placeholder={t("account:email.placeholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          error={error}
          helper={t("account:email.helper")}
          testID="email-input"
        />
        <Button
          label={t("account:email.cta")}
          onPress={() => void sendCode()}
          busy={busy}
          disabled={email.trim().length < 5}
          testID="email-send"
        />
      </View>
      {PHONE_LOGIN_ENABLED ? (
        <Pressable
          onPress={() => router.push("/(auth)/phone")}
          style={styles.alternate}
          accessibilityRole="button"
          testID="email-use-phone"
        >
          <Text style={styles.alternateText}>{t("account:email.avecNumero")}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

/** « Continuer avec Google » : ouvre le navigateur ; le retour arrive sur
 *  l'écran google-return, qui crée la session. */
function GoogleEntry() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { t } = useTranslation();

  const open = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await Linking.openURL(await googleSignInUrl(supabase, Linking.createURL("auth")));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.google}>
      <Button
        label={t("account:email.google")}
        onPress={() => void open()}
        busy={busy}
        testID="email-google"
      />
      {failed ? (
        <Text style={styles.googleError} testID="email-google-error">
          {t("account:email.googleIndisponible")}
        </Text>
      ) : null}
      <Text style={styles.or}>{t("account:email.ou")}</Text>
    </View>
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
  google: { marginTop: spacing[6], gap: spacing[4] },
  googleError: { color: color.semantic.error.default, fontSize: typography.fontSize.sm },
  or: { textAlign: "center", color: color.neutral[500], fontSize: typography.fontSize.sm },
  form: { marginTop: spacing[6], gap: spacing[4] },
  alternate: { marginTop: spacing[5], alignSelf: "center", padding: spacing[2] },
  alternateText: { color: color.brand[500], fontSize: typography.fontSize.sm, fontWeight: "600" },
});
