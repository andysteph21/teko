// Panneau C-14 — course en cours : destination, montant estimé, mode de
// paiement, partage du trajet. Le bandeau « position figée » applique le
// contrat du spike (doc 11 : tolérer les trous de positions, pas une erreur).

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button, DriverCard } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

/** « Arrivée 14 h 46 » — départ réel + durée estimée backend. */
export function arrivalTimeText(startedAtIso: string | null, durationS: number | null) {
  if (!startedAtIso || durationS === null) return null;
  const at = new Date(new Date(startedAtIso).getTime() + durationS * 1_000);
  if (Number.isNaN(at.getTime())) return null;
  return `${at.getHours()} h ${String(at.getMinutes()).padStart(2, "0")}`;
}

export interface CoursePanelProps {
  ride: RideRow;
  driverName: string | null;
  destinationLabel: string | null;
  positionStale: boolean;
  sharing: boolean;
  onShare: () => void;
}

export function CoursePanel(props: CoursePanelProps) {
  const { ride, driverName, destinationLabel, positionStale, sharing, onShare } = props;
  const { t } = useTranslation();
  const heure = arrivalTimeText(ride.started_at, ride.duration_est_s);
  const payment =
    ride.payment_method === "airtel"
      ? t("ride:suivi.paiementAirtel")
      : t("ride:suivi.paiementEspeces");
  const name = driverName ?? t("ride:suivi.chauffeurFallback");
  return (
    <BottomPanel>
      {positionStale ? (
        <View style={styles.stale} testID="stale-banner">
          <Text style={styles.staleText}>{t("ride:suivi.positionFigee")}</Text>
        </View>
      ) : null}
      <View style={styles.head}>
        <Text style={styles.title}>{t("ride:suivi.enCourse")}</Text>
        {heure ? (
          <Text style={styles.badge} testID="ride-arrival">
            {t("ride:suivi.arrivee", { heure })}
          </Text>
        ) : null}
      </View>
      <Text style={styles.dest}>
        {t("ride:suivi.vers")}{" "}
        <Text style={styles.destStrong}>
          {destinationLabel ?? t("ride:suivi.destinationFallback")}
        </Text>
        {ride.price_est !== null ? ` · ${formatXaf(ride.price_est)}` : ""}
        {` · ${payment}`}
      </Text>
      <DriverCard
        name={name}
        initials={name.charAt(0).toUpperCase()}
        detail={t("ride:suivi.vousConduit")}
        testID="driver-card"
      />
      <View style={styles.actions}>
        <Button
          label={t("ride:suivi.partager")}
          variant="secondary"
          onPress={onShare}
          busy={sharing}
          testID="ride-share"
        />
      </View>
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  stale: {
    backgroundColor: color.semantic.warning.light,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: spacing[2],
    marginBottom: spacing[3],
  },
  staleText: {
    color: color.semantic.warning.dark,
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[1],
  },
  title: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.brand[900] },
  badge: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.semantic.success.dark,
    backgroundColor: color.semantic.success.light,
    borderRadius: 9999,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    overflow: "hidden",
    fontVariant: ["tabular-nums"],
  },
  dest: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginBottom: spacing[2],
    fontVariant: ["tabular-nums"],
  },
  destStrong: { fontWeight: "700", color: color.neutral[700] },
  actions: { marginTop: spacing[3] },
});
