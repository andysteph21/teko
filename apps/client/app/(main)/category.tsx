// C-10 Catégorie & estimation — itinéraire sur carte (haut), feuille blanche :
// 3 catégories à prix ferme (backend, décision n° 6), paiement Espèces/Airtel,
// CTA « Commander {catégorie} · {prix} ». Sans brouillon complet → accueil.

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button, CarIcon, CategoryCard, DataWidget, MotoIcon, PanelTitle } from "@teko/ui/native";
import { type Href, Redirect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { TILES_URL } from "../../src/config";
import { OfflineScreen } from "../../src/components/offline-screen";
import { BackChip } from "../../src/features/booking/back-chip";
import { LandmarkMarker, RouteOverlay } from "../../src/features/booking/booking-map-layers";
import { PaymentSelector } from "../../src/features/booking/payment-selector";
import { useBookingStore } from "../../src/features/booking/store";
import { useEstimates } from "../../src/features/booking/use-estimates";
import { useDataUsage, useResolvedMapMode } from "../../src/features/data/data-state";
import { ClientDot } from "../../src/features/map/client-dot";
import { TekoMapView } from "../../src/features/map/native-map";

function SkeletonRows() {
  return (
    <View style={styles.cards} testID="estimates-skeleton">
      {["eco", "moto", "confort"].map((k) => (
        <View key={k} style={styles.skeleton} />
      ))}
    </View>
  );
}

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
    return <OfflineScreen onRetry={() => void estimatesQuery.refetch()} />;
  }

  const minutes = draft.route ? Math.max(1, Math.round(draft.route.durationS / 60)) : 0;
  const price = draft.estimates[draft.category];
  const categoryLabel = t(`booking:categories.${draft.category}`);
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
          <View style={styles.cards}>
            <CategoryCard
              title={t("booking:categories.eco")}
              meta={t("booking:categorie.metaEco", { min: minutes })}
              priceText={draft.estimates.eco != null ? formatXaf(draft.estimates.eco, "FCFA") : "—"}
              icon={<CarIcon />}
              selected={draft.category === "eco"}
              onPress={() => setCategory("eco")}
              testID="cat-eco"
            />
            <CategoryCard
              title={t("booking:categories.moto")}
              meta={t("booking:categorie.metaMoto")}
              priceText={
                draft.estimates.moto != null ? formatXaf(draft.estimates.moto, "FCFA") : "—"
              }
              icon={<MotoIcon />}
              selected={draft.category === "moto"}
              onPress={() => setCategory("moto")}
              testID="cat-moto"
            />
            <CategoryCard
              title={t("booking:categories.confort")}
              meta={t("booking:categorie.metaConfort")}
              priceText={
                draft.estimates.confort != null ? formatXaf(draft.estimates.confort, "FCFA") : "—"
              }
              icon={<CarIcon />}
              selected={draft.category === "confort"}
              onPress={() => setCategory("confort")}
              testID="cat-confort"
            />
          </View>
        )}
        <PaymentSelector value={draft.paymentMethod} onChange={setPaymentMethod} />
        <Text style={styles.fixed}>{t("booking:categorie.prixFixe")}</Text>
        <Button
          label={t("booking:categorie.commander", {
            categorie: categoryLabel,
            prix: price != null ? formatXaf(price, "FCFA") : "—",
          })}
          onPress={() => router.push("/(main)/meeting" as Href)}
          disabled={loading || price == null}
          testID="order-cta"
        />
        <Pressable
          onPress={() => router.push("/(main)/schedule" as Href)}
          accessibilityRole="button"
          style={styles.later}
          testID="schedule-later"
        >
          <Text style={styles.laterText}>{t("booking:categorie.planifierPlusTard")}</Text>
        </Pressable>
      </BottomPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  mapWrap: { flex: 1 },
  widget: { position: "absolute", left: spacing[4], bottom: spacing[4] },
  sheet: { marginTop: -spacing[3] },
  cards: { gap: spacing[2], marginBottom: spacing[3] },
  skeleton: {
    height: 62,
    borderRadius: 16,
    backgroundColor: color.neutral[100],
  },
  fixed: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[500],
    textAlign: "center",
    marginVertical: spacing[3],
  },
  later: { alignSelf: "center", padding: spacing[2], marginTop: spacing[1] },
  laterText: { color: color.brand[800], fontSize: typography.fontSize.sm, fontWeight: "600" },
});
