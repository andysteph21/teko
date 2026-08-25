// C-21 Annulation — motif obligatoire, frais annoncés AVANT confirmation :
// gratuits tant que la course est « requested », sinon montant (jamais la
// formule — règle produit). Confirmée → retour accueil + brouillon vidé.

import { useQuery } from "@tanstack/react-query";
import { cancelRide, estimateCancellationFee, getRide, TekoApiError } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBookingStore } from "../../../src/features/booking/store";
import {
  type CancelReasonKey,
  CancelReasons,
  FeeNotice,
} from "../../../src/features/history/cancel-parts";
import { CANCELLABLE_STATUSES } from "../../../src/features/history/ride-display";
import { ScreenHeader } from "../../../src/features/history/screen-header";
import { supabase } from "../../../src/lib/supabase";

export default function CancelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const resetBooking = useBookingStore((s) => s.reset);
  const [reason, setReason] = useState<CancelReasonKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ride = useQuery({
    queryKey: ["ride", id],
    enabled: Boolean(id),
    queryFn: () => getRide(supabase, id as string),
  });

  const free = ride.data?.status === "requested";
  const cancellable = ride.data ? CANCELLABLE_STATUSES.includes(ride.data.status) : false;
  // Montant SERVEUR (RPC) — la config des frais n'est pas lisible côté client.
  const fee = useQuery({
    queryKey: ["cancel-fee", id, ride.data?.status],
    enabled: Boolean(id && ride.data && !free),
    queryFn: () => estimateCancellationFee(supabase, id as string),
  });
  const feeText = formatXaf(free || !ride.data ? 0 : (fee.data ?? 0), "FCFA");

  const confirm = async () => {
    if (!id || !reason) return;
    setBusy(true);
    setError(null);
    try {
      await cancelRide(supabase, id, t(`history:annulation.${reason}`));
      resetBooking();
      router.replace("/(main)/home" as Href);
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("erreurs.generique"),
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title={t("history:annulation.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{t("history:annulation.sousTitre")}</Text>
        <CancelReasons selected={reason} onSelect={setReason} />
        {ride.data ? (
          cancellable ? (
            <FeeNotice free={free} feeText={feeText} />
          ) : (
            <Text style={styles.impossible}>{t("history:annulation.impossible")}</Text>
          )
        ) : null}
        <Button
          label={t("history:annulation.garder")}
          onPress={() => router.back()}
          testID="cancel-keep"
        />
        <Button
          label={
            free
              ? t("history:annulation.confirmer")
              : t("history:annulation.confirmerAvecFrais", { montant: feeText })
          }
          variant="danger"
          onPress={() => void confirm()}
          disabled={!reason || !cancellable}
          busy={busy}
          testID="cancel-confirm"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm + 1,
    color: color.neutral[500],
    marginBottom: spacing[3],
  },
  impossible: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginBottom: spacing[3],
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    textAlign: "center",
  },
});
