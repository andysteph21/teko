// C-04 Code OTP — 6 chiffres, renvoi 30 s puis 60 s, verrouillage doux géré
// par le backend. Repli e-mail = MVP uniquement (badge ambre), proposé après
// deux renvois. Nouveau compte → C-05 profil ; compte existant → routage C-01.

import { getProfile, signInWithPhoneOtp, TekoApiError, verifyPhoneOtp } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, MvpBadge, OtpInput } from "@teko/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
      const profile = await getProfile(supabase, session.user.id);
      if (profile.full_name) router.replace("/");
      else router.replace("/(auth)/profile-setup");
    } catch (e) {
      setBusy(false);
      setCode("");
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("account:otp.erreurCode"),
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("account:otp.titre")}</Text>
      <Text style={styles.text}>
        {t("account:otp.envoyeAu", { phone })}{" "}
        <Text style={styles.modify} onPress={() => router.back()}>
          {t("account:otp.modifier")}
        </Text>
      </Text>
      <View style={styles.form}>
        <OtpInput
          value={code}
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
          busy={busy}
          disabled={code.length < 6}
          testID="otp-continue"
        />
        {resendIn > 0 ? (
          <Text style={styles.resendWait}>{t("account:otp.renvoyerDans", { s: resendIn })}</Text>
        ) : (
          <Pressable onPress={() => void resend()} accessibilityRole="button" style={styles.resend}>
            <Text style={styles.resendText}>{t("account:otp.renvoyer")}</Text>
          </Pressable>
        )}
        {resendCount >= 2 ? (
          <View style={styles.fallback}>
            <Text style={styles.resendWait}>{t("account:otp.ou")}</Text>
            <View style={styles.fallbackRow}>
              <Text style={styles.resendText}>{t("account:otp.repliEmail")}</Text>
              <MvpBadge />
            </View>
          </View>
        ) : null}
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
  text: { fontSize: typography.fontSize.base, color: color.neutral[500], marginTop: spacing[2] },
  modify: { color: color.brand[500], fontWeight: "600" },
  form: { marginTop: spacing[6], gap: spacing[4] },
  error: { color: color.semantic.error.default, fontSize: typography.fontSize.sm },
  resend: { alignSelf: "center", padding: spacing[1] },
  resendText: { color: color.brand[500], fontSize: typography.fontSize.sm, fontWeight: "600" },
  resendWait: {
    color: color.neutral[500],
    fontSize: typography.fontSize.sm,
    alignSelf: "center",
    fontVariant: ["tabular-nums"],
  },
  fallback: { alignItems: "center", gap: spacing[1] },
  fallbackRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
});
