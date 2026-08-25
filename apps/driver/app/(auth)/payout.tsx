// D-07 Inscription 4/4 — Versements : le numéro Airtel Money qui recevra
// les gains (défaut = numéro du compte, modifiable). Moov grisé « bientôt ».
// Terminer → D-08 vérification (replace : on ne revient pas dans l'assistant).

import { setPayoutMsisdn, TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/features/auth/use-session";
import { PayoutProviders } from "../../src/features/kyc/payout-providers";
import { StepBar } from "../../src/features/kyc/step-bar";
import { supabase } from "../../src/lib/supabase";

/** Numéro national extrait du compte : « 24107000002 » → « 07000002 ». */
export function nationalFromAccount(phone: string | undefined): string {
  return (phone ?? "").replace(/^\+?241/, "");
}

export default function Payout() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [digits, setDigits] = useState(() => nationalFromAccount(session?.user.phone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  // Le numéro du compte arrive après l'hydratation de la session — il ne
  // pré-remplit que si le champ est encore vide.
  const accountPhone = session?.user.phone;
  useEffect(() => {
    const national = nationalFromAccount(accountPhone);
    if (national) setDigits((v) => (v === "" ? national : v));
  }, [accountPhone]);

  const submit = async () => {
    if (!userId) return;
    const cleaned = digits.replace(/\s/g, "");
    if (!/^\d{8,9}$/.test(cleaned)) {
      setError(t("kyc:versements.erreurFormat"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setPayoutMsisdn(supabase, userId, `+241${cleaned}`);
      router.replace("/(auth)/verification" as Href);
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
      <StepBar
        step={4}
        title={t("kyc:versements.titre")}
        onBack={() => router.back()}
        testID="payout-steps"
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sub}>{t("kyc:versements.sub")}</Text>
        <PayoutProviders />
        <TextField
          label={t("kyc:versements.numeroLabel")}
          prefix="🇬🇦 +241"
          placeholder={t("kyc:phone.placeholder")}
          keyboardType="phone-pad"
          value={digits}
          onChangeText={(v) => {
            setDigits(v);
            setError(null);
          }}
          error={error}
          helper={t("kyc:versements.helper")}
          testID="payout-msisdn"
        />
        <Button
          label={t("kyc:versements.cta")}
          onPress={() => void submit()}
          accent="driver"
          busy={busy}
          disabled={digits.replace(/\s/g, "").length < 8}
          testID="payout-finish"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: color.neutral[50],
  },
  content: {
    paddingHorizontal: spacing[2],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  sub: { fontSize: typography.fontSize.sm, lineHeight: 20, color: color.neutral[500] },
});
