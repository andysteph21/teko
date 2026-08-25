// C-15 Paiement — montant qui fait foi (final sinon estimé), encaissement
// Airtel Money suivi par poll 3 s (push USSD, renvoi, échec) ; le repli
// espèces n'est JAMAIS une impasse. Espèces : consigne + Continuer → C-16.

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../../src/features/auth/use-session";
import { montantCourse, telephoneAffiche } from "../../../src/features/payment/format";
import {
  type PaymentRow,
  useRenvoyerPush,
  useRide,
  useRideCollection,
} from "../../../src/features/payment/hooks";
import { AirtelCard, CashCard } from "../../../src/features/payment/payment-cards";
import { PaymentHeader } from "../../../src/features/payment/payment-header";
import { ErrorView, LoadingView } from "../../../src/features/payment/state-views";

function AirtelSection({
  payment,
  numero,
  onCash,
}: {
  payment: PaymentRow | null;
  numero: string | null;
  onCash: () => void;
}) {
  const { t } = useTranslation();
  const renvoyer = useRenvoyerPush(payment?.id);
  return (
    <>
      <AirtelCard
        numero={numero}
        echec={payment?.status === "failed"}
        onRenvoyer={() => renvoyer.mutate()}
        busy={renvoyer.isPending}
        disabled={!payment}
      />
      <CashCard
        titre={t("payment:paiement.altTitre")}
        texte={t("payment:paiement.altTexte")}
        onPress={onCash}
        testID="pay-cash-alt"
      />
    </>
  );
}

function CashSection({ montant, onContinuer }: { montant: number; onContinuer: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <CashCard
        titre={t("payment:paiement.especes")}
        texte={t("payment:paiement.remettez", { montant: formatXaf(montant, "FCFA") })}
      />
      <View style={styles.continuer}>
        <Button label={t("commun.continuer")} onPress={onContinuer} testID="payment-continue" />
      </View>
    </>
  );
}

export default function PaymentScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const [repliEspeces, setRepliEspeces] = useState(false);
  const rideQ = useRide(rideId);
  const modeAirtel = !repliEspeces && rideQ.data?.payment_method === "airtel";
  const { payment } = useRideCollection(rideId, modeAirtel);

  const versEvaluation = useCallback(
    () => router.replace(`/(main)/rating/${rideId}` as Href),
    [router, rideId],
  );

  useEffect(() => {
    if (modeAirtel && payment?.status === "success") versEvaluation();
  }, [modeAirtel, payment?.status, versEvaluation]);

  if (rideQ.isError)
    return <ErrorView error={rideQ.error} onRetry={() => void rideQ.refetch()} />;
  if (!rideQ.data) return <LoadingView />;

  const numero = session?.user.phone ? telephoneAffiche(session.user.phone) : null;
  return (
    <SafeAreaView style={styles.screen}>
      <PaymentHeader ride={rideQ.data} />
      {modeAirtel ? (
        <AirtelSection payment={payment} numero={numero} onCash={() => setRepliEspeces(true)} />
      ) : (
        <CashSection montant={montantCourse(rideQ.data)} onContinuer={versEvaluation} />
      )}
      <Text style={styles.note}>{t("payment:paiement.note")}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    paddingTop: spacing[8],
    paddingHorizontal: spacing[6],
  },
  continuer: { marginTop: spacing[3] },
  note: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[400],
    textAlign: "center",
    marginTop: 18,
  },
});
