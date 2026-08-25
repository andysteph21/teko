// D-03 Connexion chauffeur — même entrée que l'app client : +241 pré-fixé,
// code SMS, pas de mot de passe. Encart « nouveau chauffeur » : 4 étapes,
// 10 minutes, validation sous 48 h.

import { signInWithPhoneOtp, TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";

/** Numéro national gabonais : 8 chiffres. Les numéros de test locaux
 *  (070000002…) en font 9 — tolérés en dev. */
export function isValidGabonNational(digits: string): boolean {
  return /^\d{8,9}$/.test(digits);
}

const DEV_DEFAULT = __DEV__ ? "07000002" : "";

export default function Phone() {
  const [digits, setDigits] = useState(DEV_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const sendCode = async () => {
    const cleaned = digits.replace(/\s/g, "");
    if (!isValidGabonNational(cleaned)) {
      setError(t("kyc:phone.erreurFormat"));
      return;
    }
    setBusy(true);
    setError(null);
    const phone = `+241${cleaned}`;
    try {
      await signInWithPhoneOtp(supabase, phone);
      router.push({ pathname: "/(auth)/otp", params: { phone } } as unknown as Href);
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
      <Text style={styles.title}>{t("kyc:phone.titre")}</Text>
      <Text style={styles.text}>{t("kyc:phone.texte")}</Text>
      <View style={styles.form}>
        <TextField
          label={t("kyc:phone.label")}
          prefix="🇬🇦 +241"
          placeholder={t("kyc:phone.placeholder")}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={digits}
          onChangeText={(v) => {
            setDigits(v);
            setError(null);
          }}
          error={error}
          helper={t("kyc:phone.helper")}
          testID="phone-input"
        />
        <Button
          label={t("kyc:phone.cta")}
          onPress={sendCode}
          accent="driver"
          busy={busy}
          disabled={digits.replace(/\s/g, "").length < 8}
          testID="phone-send"
        />
      </View>
      <View style={styles.newDriver}>
        <Text style={styles.newDriverText}>
          <Text style={styles.newDriverStrong}>{t("kyc:phone.nouveauTitre")}</Text>{" "}
          {t("kyc:phone.nouveauTexte")}
        </Text>
      </View>
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
  newDriver: {
    marginTop: spacing[6],
    backgroundColor: color.role.driver.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: color.role.driver.accent,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: spacing[3],
  },
  newDriverText: { fontSize: typography.fontSize.sm, lineHeight: 20, color: color.neutral[500] },
  newDriverStrong: { fontWeight: "700", color: color.role.driver.accentDark },
});
