// D-03 Code OTP chauffeur — 6 chiffres, renvoi 30 s puis 60 s, repli e-mail
// MVP après deux renvois. Après vérification : pas de fiche chauffeur →
// D-04 identité (parcours G) ; sinon retour au splash qui route l'état.

import { getMyDriver, signInWithPhoneOtp, TekoApiError, verifyPhoneOtp } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, MvpBadge, OtpInput } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";

export default function Otp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(30);
  const [resendCount, setResendCount] = useState(0);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1_000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const resend = async () => {
    if (!phone) return;
    setResendCount((n) => n + 1);
    setResendIn(60);
    await signInWithPhoneOtp(supabase, phone).catch(() => setError(t("erreurs.generique")));
  };

  const verify = async (value: string) => {
    if (!phone || value.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const session = await verifyPhoneOtp(supabase, phone, value);
      const driver = await getMyDriver(supabase, session.user.id);
      if (driver) router.replace("/");
      else router.replace("/(auth)/identity" as Href);
    } catch (e) {
      setBusy(false);
      setCode("");
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("kyc:otp.erreurCode"),
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("kyc:otp.titre")}</Text>
      <Text style={styles.text}>
        {t("kyc:otp.envoyeAu", { phone })}{" "}
        <Text style={styles.modify} onPress={() => router.back()}>
          {t("kyc:otp.modifier")}
        </Text>
      </Text>
      <View style={styles.form}>
        <OtpInput
          value={code}
          accentColor={color.role.driver.accent}
          onChange={(v) => {
            setCode(v);
            setError(null);
            if (v.length === 6) void verify(v);
          }}
          testID="otp"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={t("commun.continuer")}
          onPress={() => void verify(code)}
          accent="driver"
          busy={busy}
          disabled={code.length < 6}
          testID="otp-continue"
        />
        <ResendBlock resendIn={resendIn} resendCount={resendCount} onResend={() => void resend()} />
      </View>
    </SafeAreaView>
  );
}

interface ResendBlockProps {
  resendIn: number;
  resendCount: number;
  onResend: () => void;
}

/** Renvoi du code (compte à rebours) + repli e-mail MVP après deux renvois. */
function ResendBlock({ resendIn, resendCount, onResend }: ResendBlockProps) {
  const { t } = useTranslation();
  return (
    <>
      {resendIn > 0 ? (
        <Text style={styles.resendWait}>{t("kyc:otp.renvoyerDans", { s: resendIn })}</Text>
      ) : (
        <Pressable
          onPress={onResend}
          accessibilityRole="button"
          style={styles.resend}
          testID="otp-resend"
        >
          <Text style={styles.resendText}>{t("kyc:otp.renvoyer")}</Text>
        </Pressable>
      )}
      {resendCount >= 2 ? (
        <View style={styles.fallback}>
          <Text style={styles.resendWait}>{t("kyc:otp.ou")}</Text>
          <View style={styles.fallbackRow}>
            <Text style={styles.resendText}>{t("kyc:otp.repliEmail")}</Text>
            <MvpBadge />
          </View>
        </View>
      ) : null}
    </>
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
  text: { fontSize: typography.fontSize.base, color: color.neutral[500], marginTop: spacing[2] },
  modify: { color: color.role.driver.accentDark, fontWeight: "600" },
  form: { marginTop: spacing[6], gap: spacing[4] },
  error: { color: color.semantic.error.default, fontSize: typography.fontSize.sm },
  resend: { alignSelf: "center", padding: spacing[1] },
  resendText: {
    color: color.role.driver.accentDark,
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
  },
  resendWait: {
    color: color.neutral[500],
    fontSize: typography.fontSize.sm,
    alignSelf: "center",
    fontVariant: ["tabular-nums"],
  },
  fallback: { alignItems: "center", gap: spacing[1] },
  fallbackRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
});
