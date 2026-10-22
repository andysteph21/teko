// C-10 Catégorie & estimation — itinéraire sur carte (haut), feuille blanche :
// 3 catégories à prix ferme (backend, décision n° 6), paiement Espèces/Airtel,
// CTA « Commander {catégorie} · {prix} ». Sans brouillon complet → accueil.

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button, DataWidget, PanelTitle } from "@teko/ui/native";
import { type Href, Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { TILES_URL } from "../../src/config";
import { BackChip } from "../../src/features/booking/back-chip";
import { LandmarkMarker, RouteOverlay } from "../../src/features/booking/booking-map-layers";
import { CategoryList, SkeletonRows } from "../../src/features/booking/category-cards";
import { PaymentSelector } from "../../src/features/booking/payment-selector";
import { QuoteErrorScreen } from "../../src/features/booking/quote-error-screen";
import { useBookingStore } from "../../src/features/booking/store";
import { useEstimates } from "../../src/features/booking/use-estimates";
import { useDataUsage, useResolvedMapMode } from "../../src/features/data/data-state";
import { ClientDot } from "../../src/features/map/client-dot";
import { TekoMapView } from "../../src/features/map/native-map";

export default function Category() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useBookingStore(
    useShallow((s) => ({
      origin: s.origin,
      destination: s.destination,
      category: s.category,
      paymentMethod: s.paymentMethod,
      route: s.route,
      estimates: s.estimates,
    })),
  );
  const setCategory = useBookingStore((s) => s.setCategory);
  const setPaymentMethod = useBookingStore((s) => s.setPaymentMethod);
  const estimatesQuery = useEstimates();
  const mode = useResolvedMapMode();
  const usage = useDataUsage();

  if (!draft.origin || !draft.destination) {
    return <Redirect href={"/(main)/home" as Href} />;
  }
  if (estimatesQuery.error) {
    return (
      <QuoteErrorScreen
        error={estimatesQuery.error}
        onRetry={() => void estimatesQuery.refetch()}
      />
    );
  }

  const minutes = draft.route ? Math.max(1, Math.round(draft.route.durationS / 60)) : 0;
  const price = draft.estimates[draft.category];
  const loading = estimatesQuery.isPending;

  return (
    <View style={styles.screen}>
      <View style={styles.mapWrap}>
        <TekoMapView
          options={{ tilesUrl: TILES_URL, eco: mode.mode === "eco" }}
          center={draft.origin.position}
          zoom={13.4}
        >
          <RouteOverlay coordinates={draft.route?.coordinates ?? []} />
          <ClientDot position={draft.origin.position} />
          <LandmarkMarker position={draft.destination.position} />
        </TekoMapView>
        <BackChip onPress={() => router.back()} />
        <View style={styles.widget}>
          <DataWidget
            quantityText={usage.quantityText}
            state={usage.state}
            onPress={() => router.push("/(main)/data-settings" as Href)}
            testID="data-widget"
          />
        </View>
      </View>

      <BottomPanel
        style={StyleSheet.flatten([styles.sheet, { paddingBottom: insets.bottom + spacing[3] }])}
      >
        <PanelTitle>{t("booking:categorie.titre")}</PanelTitle>
        {loading ? (
          <SkeletonRows />
        ) : (
          <CategoryList
            estimates={draft.estimates}
            selected={draft.category}
            minutes={minutes}
            onSelect={setCategory}
          />
        )}
        <PaymentSelector value={draft.paymentMethod} onChange={setPaymentMethod} />
        <Text style={styles.fixed}>{t("booking:categorie.prixFixe")}</Text>
        <Button
          label={t("booking:categorie.commander", {
            categorie: t(`booking:categories.${draft.category}`),
            prix: price != null ? formatXaf(price, "FCFA") : "—",
          })}
          onPress={() => router.push("/(main)/meeting" as Href)}
          disabled={loading || price == null}
          testID="order-cta"
        />
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  mapWrap: { flex: 1 },
  widget: { position: "absolute", left: spacing[4], bottom: spacing[4] },
  sheet: { marginTop: -spacing[3] },
  fixed: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[500],
    textAlign: "center",
    marginVertical: spacing[3],
  },
  later: { alignSelf: "center", padding: spacing[2], marginTop: spacing[1] },
  laterText: { color: color.brand[800], fontSize: typography.fontSize.sm, fontWeight: "600" },
});
