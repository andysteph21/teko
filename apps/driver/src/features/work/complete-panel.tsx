// D-14 Fin de course, espèces — le montant à encaisser EN TRÈS GRAND,
// « J'ai encaissé {montant} » ramène à l'accueil (toast solde mis à jour).
// Détail commission/net omis : non exposé par le backend après clôture
// (TODO backend : reçu de course côté chauffeur).

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface CompletePanelProps {
  ride: RideRow;
  /** Solde du jour rafraîchi après clôture — null tant qu'il charge. */
  newBalance: number | null;
  onDone: () => void;
}

/** Montant encaissable — les numeric Postgres reviennent en strings. */
export function collectAmount(ride: Pick<RideRow, "price_final" | "price_est">): number {
  return Number(ride.price_final ?? ride.price_est ?? 0);
}

export function rideMinutes(ride: Pick<RideRow, "started_at" | "completed_at">): number | null {
  if (!ride.started_at || !ride.completed_at) return null;
  const ms = Date.parse(ride.completed_at) - Date.parse(ride.started_at);
  return Math.max(1, Math.round(ms / 60_000));
}

export function CheckBadge() {
  return (
    <View style={styles.check}>
      <Svg width={28} height={28} viewBox="0 0 24 24">
        <Path
          d="M4.5 12.5l5 5 10-11"
          stroke={color.semantic.success.default}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function CompleteSubtitle({ ride }: { ride: RideRow }) {
  const { t } = useTranslation();
  const minutes = rideMinutes(ride);
  return (
    <Text style={styles.sub}>
      {minutes !== null
        ? t("work:fin.sousTitre", {
            categorie: t(`work:categories.${ride.category}`),
            duree: minutes,
          })
        : t(`work:categories.${ride.category}`)}
    </Text>
  );
}

export function CompletePanel({ ride, newBalance, onDone }: CompletePanelProps) {
  const { t } = useTranslation();
  const amount = collectAmount(ride);

  return (
    <View style={styles.screen}>
      <CheckBadge />
      <Text style={styles.title}>{t("work:fin.titre")}</Text>
      <CompleteSubtitle ride={ride} />
      <View style={styles.collect}>
        <Text style={styles.collectLabel}>{t("work:fin.aEncaisser")}</Text>
        <Text style={styles.collectAmount} testID="collect-amount">
          {formatXaf(amount, "FCFA")}
        </Text>
        <Text style={styles.collectHint}>{t("work:fin.remiseMontant")}</Text>
      </View>
      <View style={styles.detail}>
        <View style={styles.line}>
          <Text style={styles.lineLabel}>{t("work:fin.ligneCourse")}</Text>
          <Text style={styles.lineValue}>{formatXaf(amount, "FCFA")}</Text>
        </View>
        {newBalance !== null ? (
          <View style={[styles.line, styles.lineLast]}>
            <Text style={styles.lineLabel}>{t("work:fin.nouveauSolde")}</Text>
            <Text style={[styles.lineValue, styles.linePos]} testID="new-balance">
              {newBalance > 0 ? "+" : ""}
              {formatXaf(newBalance, "FCFA")}
            </Text>
          </View>
        ) : null}
      </View>
      <Button
        label={t("work:fin.encaisse", { montant: formatXaf(amount) })}
        accent="driver"
        onPress={onDone}
        testID="ride-cash-done"
      />
      {/* TODO écran de notation chauffeur → client (hors périmètre du lot). */}
      <Pressable style={styles.rate} accessibilityRole="button" testID="ride-rate">
        <Text style={styles.rateText}>{t("work:fin.noterPassager")}</Text>
      </Pressable>
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
  check: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.success.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
  },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginTop: 2,
    marginBottom: 22,
  },
  collect: {
    alignSelf: "stretch",
    backgroundColor: color.semantic.warning.light,
    borderWidth: 1.5,
    borderColor: color.semantic.warning.default,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: "center",
    marginBottom: spacing[3],
  },
  collectLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.semantic.warning.dark,
    marginBottom: spacing[1],
  },
  collectAmount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize["3xl"],
    fontWeight: "900",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
    marginBottom: spacing[1],
  },
  collectHint: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  detail: {
    alignSelf: "stretch",
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    marginBottom: spacing[4],
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: color.neutral[100],
  },
  lineLast: { borderBottomWidth: 0 },
  lineLabel: { fontSize: typography.fontSize.sm + 0.5, color: color.neutral[500] },
  lineValue: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm + 0.5,
    fontWeight: "600",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  linePos: { color: color.semantic.success.dark },
  rate: { marginTop: spacing[3], padding: spacing[2] },
  rateText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.brand[800] },
});
