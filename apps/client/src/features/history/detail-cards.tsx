// Corps du détail de course C-20 (sans carte au MVP de ce lot) : ligne
// « quand », carte trajet (colonne départ magenta → arrivée ambre), carte
// infos (chauffeur, paiement, total), reçu si terminée.

import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { describeWhen, rideAmountText } from "./ride-display";

function RouteCard({ ride }: { ride: RideRow }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.route}>
        <View style={styles.dotColumn}>
          <View style={[styles.dot, { backgroundColor: color.map.markerClient }]} />
          <View style={styles.dotLine} />
          <View style={[styles.dot, { backgroundColor: color.map.markerLandmark }]} />
        </View>
        <View style={styles.routeBody}>
          <Text style={styles.place}>{ride.origin_hint ?? t("history:detail.depart")}</Text>
          <Text style={[styles.place, styles.placeLast]}>
            {ride.dest_hint ?? t("history:detail.arrivee")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoCard({ ride, driverName }: { ride: RideRow; driverName: string | null }) {
  const { t } = useTranslation();
  const paymentLabel =
    ride.payment_method === "airtel"
      ? t("history:detail.paiementAirtel")
      : ride.payment_method === "cash"
        ? t("history:detail.paiementEspeces")
        : null;
  return (
    <View style={styles.card}>
      {driverName ? (
        <View style={styles.line}>
          <Text style={styles.lineLabel}>{t("history:detail.chauffeur")}</Text>
          <Text style={styles.lineValue}>{driverName}</Text>
        </View>
      ) : null}
      {paymentLabel ? (
        <View style={styles.line}>
          <Text style={styles.lineLabel}>{t("history:detail.paiement")}</Text>
          <Text style={styles.lineValue}>{paymentLabel}</Text>
        </View>
      ) : null}
      <View style={styles.total}>
        <Text style={styles.totalLabel}>
          {ride.price_final !== null
            ? t("history:detail.totalPaye")
            : t("history:detail.estimation")}
        </Text>
        <Text style={styles.totalAmount}>{rideAmountText(ride)}</Text>
      </View>
    </View>
  );
}

export interface DetailBodyProps {
  ride: RideRow;
  driverName: string | null;
  now: Date;
}

export function DetailBody({ ride, driverName, now }: DetailBodyProps) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={styles.body}>
      <Text style={styles.when}>{describeWhen(ride, now, t)}</Text>
      <RouteCard ride={ride} />
      <InfoCard ride={ride} driverName={driverName} />
      {ride.status === "completed" ? (
        <Button
          label={t("history:detail.voirRecu")}
          variant="secondary"
          onPress={() => router.push(`/(main)/receipt/${ride.id}` as Href)}
          testID="detail-receipt"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing[5], gap: spacing[3] },
  when: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  card: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  route: { flexDirection: "row", gap: spacing[3] },
  dotColumn: { alignItems: "center", paddingTop: 5, alignSelf: "stretch" },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full },
  dotLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: color.neutral[200],
    marginVertical: 2,
  },
  routeBody: { flex: 1, gap: 10 },
  place: { fontSize: typography.fontSize.sm + 0.5, fontWeight: "600", color: color.neutral[700] },
  placeLast: { marginBottom: 0 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  lineLabel: { fontSize: typography.fontSize.sm + 0.5, color: color.neutral[500] },
  lineValue: {
    fontSize: typography.fontSize.sm + 0.5,
    fontWeight: "600",
    color: color.neutral[700],
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: color.neutral[100],
    marginTop: spacing[2],
    paddingTop: 10,
  },
  totalLabel: { fontSize: typography.fontSize.base, fontWeight: "700", color: color.neutral[700] },
  totalAmount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.md + 1,
    fontWeight: "900",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
});
