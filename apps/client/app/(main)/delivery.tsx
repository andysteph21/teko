// Livraison de colis (R5) — après le choix du départ et de la destination :
// véhicule (voiture ou moto), colis, destinataire, prix ferme serveur, puis
// commande (request_delivery) et recherche d'un coursier. Service fermé côté
// serveur → « Service bientôt disponible », sans autre erreur.

import { TekoApiError } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ParcelForm, TripSummary, VehicleChoice } from "../../src/features/booking/delivery-form";
import { QuoteErrorScreen } from "../../src/features/booking/quote-error-screen";
import { useBookingStore } from "../../src/features/booking/store";
import { type DeliveryController, useDelivery } from "../../src/features/booking/use-delivery";
import { ScreenHeader } from "../../src/features/history/screen-header";

function ClosedView() {
  const router = useRouter();
  const { t } = useTranslation();
  const goHome = () => {
    useBookingStore.getState().setService("ride");
    router.dismissTo("/(main)/home" as Href);
  };
  return (
    <View style={styles.closed} testID="delivery-closed">
      <Text style={styles.closedTitle}>{t("booking:livraison.bientot")}</Text>
      <Text style={styles.text}>{t("booking:livraison.bientotTexte")}</Text>
      <Button
        label={t("booking:livraison.retourAccueil")}
        onPress={goHome}
        testID="delivery-home"
      />
    </View>
  );
}

function DeliveryBody({ delivery }: { delivery: DeliveryController }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const price = delivery.quote ? formatXaf(Number(delivery.quote.price), "FCFA") : null;
  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[5] }]}
      keyboardShouldPersistTaps="handled"
    >
      <TripSummary delivery={delivery} />
      <VehicleChoice delivery={delivery} />
      <ParcelForm value={delivery.parcel} onChange={delivery.setParcel} />
      <Text style={styles.text}>{t("booking:livraison.paiement")}</Text>
      {delivery.errorKey ? (
        <Text style={styles.error} accessibilityRole="alert" testID="delivery-error">
          {t(delivery.errorKey)}
        </Text>
      ) : null}
      {delivery.ready ? null : <Text style={styles.hint}>{t("booking:livraison.incomplet")}</Text>}
      <Button
        label={
          price
            ? t("booking:livraison.envoyer", { prix: price })
            : t("booking:livraison.envoyerSansPrix")
        }
        onPress={delivery.submit}
        disabled={!delivery.ready}
        busy={delivery.busy}
        testID="delivery-submit"
      />
    </ScrollView>
  );
}

export default function Delivery() {
  const router = useRouter();
  const { t } = useTranslation();
  const delivery = useDelivery();
  const { error } = delivery.quotes;

  if (!delivery.origin || !delivery.destination) {
    return <Redirect href={"/(main)/home" as Href} />;
  }
  if (error && !(error instanceof TekoApiError && error.code === "service_closed")) {
    return (
      <QuoteErrorScreen
        error={error}
        onRetry={() => void delivery.quotes.refetch()}
        onEdit={() => router.dismissTo("/(main)/search" as Href)}
      />
    );
  }
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title={t("booking:livraison.titre")} />
      {error ? <ClosedView /> : null}
      {delivery.quotes.isPending ? (
        <View style={styles.closed} testID="delivery-loading">
          <ActivityIndicator color={color.brand[800]} />
        </View>
      ) : null}
      {delivery.quotes.data ? <DeliveryBody delivery={delivery} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  body: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[4] },
  closed: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[8] },
  closedTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[2],
  },
  hint: { fontSize: typography.fontSize.sm, color: color.neutral[500], textAlign: "center" },
  error: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.default,
    textAlign: "center",
  },
});
