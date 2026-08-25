// D-14b Paiement Airtel en attente — le passager confirme sur son téléphone,
// l'écran s'interroge toutes les 3 s (payments hors Realtime). Confirmé →
// retour accueil avec toast ; échec → repli espèces expliqué.
// Écart maquette assumé : « Basculer en espèces » non branché (aucun RPC de
// bascule côté api-client) — l'échec propose le règlement en espèces.

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { CheckBadge, CompleteSubtitle, collectAmount } from "./complete-panel";
import { useWorkStore } from "./store";
import { useRidePayment } from "./use-ride-payment";

function PulseDots() {
  return (
    <View style={styles.pulse}>
      <View style={[styles.dot, { backgroundColor: color.role.driver.accentLight }]} />
      <View style={[styles.dot, { backgroundColor: color.role.driver.accent }]} />
      <View style={[styles.dot, { backgroundColor: color.role.driver.accentDark }]} />
    </View>
  );
}

export function AirtelPanel({ ride }: { ride: RideRow }) {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useWorkStore((s) => s.showToast);
  const payment = useRidePayment(ride.id, true);
  const amount = collectAmount(ride);
  const succeeded = payment?.status === "success";
  const failed = payment?.status === "failed";

  useEffect(() => {
    if (!succeeded) return;
    showToast(t("work:fin.airtelConfirme"));
    router.replace("/(main)/home" as Href);
  }, [succeeded, router, showToast, t]);

  return (
    <View style={styles.screen}>
      <CheckBadge />
      <Text style={styles.title}>{t("work:fin.titre")}</Text>
      <CompleteSubtitle ride={ride} />
      <View style={styles.waiting} testID="airtel-waiting">
        <View style={styles.head}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>AM</Text>
          </View>
          <Text style={styles.headTitle}>{t("work:fin.airtelTitre")}</Text>
        </View>
        <PulseDots />
        <Text style={styles.text}>{t("work:fin.airtelTexte")}</Text>
        <View style={styles.amountLine}>
          <Text style={styles.amountLabel}>{t("work:fin.airtelMontant")}</Text>
          <Text style={styles.amount} testID="airtel-amount">
            {formatXaf(amount, "FCFA")}
          </Text>
        </View>
      </View>
      {failed ? (
        <>
          <Text style={styles.failed} testID="airtel-failed">
            {t("work:fin.airtelEchec")}
          </Text>
          <Button
            label={t("work:fin.retourAccueil")}
            accent="driver"
            onPress={() => router.replace("/(main)/home" as Href)}
            testID="airtel-home"
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[6],
    alignItems: "center",
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
  },
  waiting: {
    alignSelf: "stretch",
    backgroundColor: color.neutral[0],
    borderWidth: 1.5,
    borderColor: color.role.driver.accent,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: 22,
    marginBottom: spacing[3],
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[2] },
  logo: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.error.default,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: color.neutral[0], fontSize: typography.fontSize.xs, fontWeight: "900" },
  headTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.neutral[700],
  },
  pulse: { flexDirection: "row", gap: 6, marginBottom: spacing[2] },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full },
  text: { fontSize: typography.fontSize.sm + 0.5, lineHeight: 20, color: color.neutral[500] },
  amountLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: color.neutral[100],
    marginTop: spacing[3],
    paddingTop: spacing[3],
  },
  amountLabel: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  amount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.lg,
    fontWeight: "900",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  failed: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.dark,
    textAlign: "center",
    marginBottom: spacing[3],
  },
});
