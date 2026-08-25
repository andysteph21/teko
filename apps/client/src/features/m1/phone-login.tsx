// Connexion par téléphone (préfiguration C-03/C-04) — parcours OTP réel
// contre la stack locale (numéro de test 24107000001, code 123456).

import { signInWithPhoneOtp, TekoApiError, verifyPhoneOtp } from "@teko/api-client";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabase";

const DEV_TEST_PHONE = "+24107000001";

export function PhoneLogin() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(DEV_TEST_PHONE);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPhoneOtp(supabase, phone);
      setStep("code");
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

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyPhoneOtp(supabase, phone, code);
    } catch {
      setError(t("auth.codeIncorrect"));
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      {step === "phone" ? (
        <>
          <Text style={styles.label}>{t("auth.numeroTelephone")}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Pressable style={styles.button} onPress={sendCode} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={color.neutral[0]} />
            ) : (
              <Text style={styles.buttonText}>{t("auth.recevoirCode")}</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>{t("auth.codeVerification")}</Text>
          <TextInput
            style={[styles.input, styles.inputCode]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <Pressable style={styles.button} onPress={verify} disabled={busy || code.length < 6}>
            {busy ? (
              <ActivityIndicator color={color.neutral[0]} />
            ) : (
              <Text style={styles.buttonText}>{t("commun.continuer")}</Text>
            )}
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing[6],
    gap: spacing[3],
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    fontWeight: "600",
  },
  input: {
    height: spacing[12],
    backgroundColor: color.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.md,
    color: color.neutral[700],
  },
  inputCode: {
    letterSpacing: 8,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  button: {
    height: spacing[12],
    borderRadius: borderRadius.xl,
    backgroundColor: color.brand[800],
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: color.neutral[0],
    fontSize: typography.fontSize.md,
    fontWeight: "700",
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
  },
});
