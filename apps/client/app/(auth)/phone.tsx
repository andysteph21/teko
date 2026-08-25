// C-03 Numéro — l'entrée unique du compte (parcours A/B/E) : +241 pré-fixé,
// pas de mot de passe. Lien « Je n'ai plus accès à mon numéro » → parcours
// assisté (E). Rassurance : « votre compte suit votre numéro ».

import { signInWithPhoneOtp, TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";

/** Numéro national gabonais : 8 chiffres (06/07/60/62/65/66/74/77…). Les
 *  numéros de test locaux (070000001…) en font 9 — tolérés en dev. */
export function isValidGabonNational(digits: string): boolean {
  return /^\d{8,9}$/.test(digits);
}

const DEV_DEFAULT = __DEV__ ? "07000001" : "";

export default function Phone() {
  const [digits, setDigits] = useState(DEV_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const sendCode = async () => {
    const cleaned = digits.replace(/\s/g, "");
    if (!isValidGabonNational(cleaned)) {
      setError(t("account:phone.erreurFormat"));
      return;
    }
    setBusy(true);
    setError(null);
    const phone = `+241${cleaned}`;
    try {
      await signInWithPhoneOtp(supabase, phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (e) {
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("erreurs.generique"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("account:phone.titre")}</Text>
      <Text style={styles.text}>{t("account:phone.texte")}</Text>
      <View style={styles.form}>
        <TextField
          label={t("account:phone.label")}
          prefix="🇬🇦 +241"
          placeholder={t("account:phone.placeholder")}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={digits}
          onChangeText={(v) => {
            setDigits(v);
            setError(null);
          }}
          error={error}
          helper={t("account:phone.helper")}
          testID="phone-input"
        />
        <Button
          label={t("account:phone.cta")}
          onPress={sendCode}
          busy={busy}
          disabled={digits.replace(/\s/g, "").length < 8}
          testID="phone-send"
        />
      </View>
      <Pressable
        onPress={() => router.push("/(auth)/recovery")}
        style={styles.recovery}
        accessibilityRole="button"
      >
        <Text style={styles.recoveryText}>{t("account:phone.plusAcces")}</Text>
      </Pressable>
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
  recovery: { marginTop: spacing[5], alignSelf: "center", padding: spacing[2] },
  recoveryText: { color: color.brand[500], fontSize: typography.fontSize.sm, fontWeight: "600" },
});
