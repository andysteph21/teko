// C-17 Reçu — coche verte, récapitulatif (trajet, chauffeur, paiement,
// total mono), partage RN Share et retour accueil (reset du brouillon).

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBookingStore } from "../../../src/features/booking/store";
import { heureFr, jourFr, montantCourse, numeroRecu } from "../../../src/features/payment/format";
import { useDriverCard, useRide, useRideCollection } from "../../../src/features/payment/hooks";
import { CheckBadge, ReceiptCard } from "../../../src/features/payment/receipt-card";
import { ErrorView, LoadingView } from "../../../src/features/payment/state-views";

export default function ReceiptScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const rideQ = useRide(rideId);
  const airtel = rideQ.data?.payment_method === "airtel";
  const { payment } = useRideCollection(rideId, airtel, false);
  const chauffeur = useDriverCard(rideQ.data ? rideId : null);

  if (rideQ.isError) return <ErrorView error={rideQ.error} onRetry={() => void rideQ.refetch()} />;
  if (!rideQ.data) return <LoadingView />;

  const ride = rideQ.data;
  const quand = ride.completed_at ?? ride.created_at;
  const jourHeure = `${jourFr(quand) ?? t("payment:recu.aujourdhui")} · ${heureFr(quand)}`;

  const partager = () =>
    void Share.share({
      message: t("payment:recu.partageTexte", {
        depart: ride.origin_hint ?? t("payment:paiement.departDefaut"),
        arrivee: ride.dest_hint ?? t("payment:paiement.arriveeDefaut"),
        montant: formatXaf(montantCourse(ride), "FCFA"),
        date: jourHeure,
      }),
    });

  const retourAccueil = () => {
    useBookingStore.getState().reset();
    router.replace("/(main)/home" as Href);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <CheckBadge />
        <Text style={styles.titre}>{t("payment:recu.titre")}</Text>
        <Text style={styles.date}>
          {jourHeure} · {t("payment:recu.numero")}{" "}
          <Text style={styles.mono}>{numeroRecu(ride)}</Text>
        </Text>
        <ReceiptCard
          ride={ride}
          payment={payment}
          nomChauffeur={chauffeur.data?.firstName ?? null}
        />
        <Button label={t("payment:recu.retour")} onPress={retourAccueil} testID="receipt-home" />
        <Button
          label={t("payment:recu.partager")}
          variant="ghost"
          onPress={partager}
          testID="receipt-share"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: {
    paddingTop: spacing[8],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[6],
    gap: spacing[2],
  },
  titre: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
    textAlign: "center",
  },
  date: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[3],
  },
  mono: { fontVariant: ["tabular-nums"] },
});
