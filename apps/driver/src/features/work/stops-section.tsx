// Arrêts de la course dans la feuille D-13 (lot R3) : état de chaque arrêt,
// attente en cours (gratuite 3 min puis facturée à la minute), attente
// facturée après le départ, et l'action suivante — « Arrivé à l'arrêt » puis
// « Repartir », dans l'ordre.

import type { RideStop } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { billedMinutes, FREE_WAIT_S, mmss, stopPhase, waitSeconds } from "./stops";
import type { RideStops } from "./use-ride-stops";

/** Secondes d'attente à l'arrêt en cours, rafraîchies chaque seconde. */
function useWaitSeconds(arrivedAt: string | null): number {
  const [seconds, setSeconds] = useState(() => (arrivedAt ? waitSeconds(arrivedAt) : 0));
  useEffect(() => {
    if (!arrivedAt) return;
    setSeconds(waitSeconds(arrivedAt));
    const timer = setInterval(() => setSeconds(waitSeconds(arrivedAt)), 1_000);
    return () => clearInterval(timer);
  }, [arrivedAt]);
  return seconds;
}

function WaitingText({ arrivedAt }: { arrivedAt: string }) {
  const { t } = useTranslation();
  const waited = useWaitSeconds(arrivedAt);
  const billed = billedMinutes(waited);
  return (
    <Text style={[styles.state, styles.stateWaiting]} testID="stop-wait">
      {billed > 0
        ? t("work:arrets.attenteFacturee", { duree: mmss(waited), count: billed })
        : t("work:arrets.attenteGratuite", {
            duree: mmss(waited),
            reste: mmss(FREE_WAIT_S - waited),
          })}
    </Text>
  );
}

function StopState({ stop }: { stop: RideStop }) {
  const { t } = useTranslation();
  const phase = stopPhase(stop);
  if (phase === "waiting" && stop.arrivedAt) return <WaitingText arrivedAt={stop.arrivedAt} />;
  if (phase === "todo") return <Text style={styles.state}>{t("work:arrets.aVenir")}</Text>;
  return (
    <Text style={styles.state} testID={`stop-done-${stop.seq}`}>
      {stop.waitCharged > 0
        ? t("work:arrets.faitFacture", { montant: formatXaf(stop.waitCharged, "FCFA") })
        : t("work:arrets.fait")}
    </Text>
  );
}

function StopRow({ stop, name }: { stop: RideStop; name: string | null }) {
  const { t } = useTranslation();
  const label = name ?? (stop.hint ? `« ${stop.hint} »` : null);
  return (
    <View style={styles.row} testID={`stop-${stop.seq}`}>
      <View style={[styles.dot, stopPhase(stop) === "done" && styles.dotDone]} />
      <View style={styles.body}>
        <Text style={styles.name}>
          {t("work:arrets.nom", { n: stop.seq })}
          {label ? ` · ${label}` : ""}
        </Text>
        {name && stop.hint && stop.hint !== name ? (
          <Text style={styles.state}>{`« ${stop.hint} »`}</Text>
        ) : null}
        <StopState stop={stop} />
      </View>
    </View>
  );
}

export function StopsSection({ stops }: { stops: RideStops }) {
  const { t } = useTranslation();
  if (stops.stops.length === 0) return null;
  return (
    <View style={styles.section} testID="ride-stops">
      <Text style={styles.title}>{t("work:arrets.titre")}</Text>
      {stops.stops.map((stop) => (
        <StopRow
          key={stop.id}
          stop={stop}
          name={stop.landmarkId ? (stops.names[stop.landmarkId] ?? null) : null}
        />
      ))}
      <Text style={styles.rule}>{t("work:arrets.regle")}</Text>
      {stops.current ? (
        <Button
          label={t("work:arrets.repartir")}
          variant="secondary"
          busy={stops.busy}
          onPress={stops.leave}
          testID="stop-leave"
        />
      ) : null}
      {stops.next ? (
        <Button
          label={t("work:arrets.arrive", { n: stops.next.seq })}
          variant="secondary"
          busy={stops.busy}
          onPress={stops.arrive}
          testID="stop-arrive"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[500],
  },
  row: { flexDirection: "row", gap: spacing[2] },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: color.role.driver.accentDark,
    marginTop: 5,
  },
  dotDone: { backgroundColor: color.role.driver.accentDark },
  body: { flex: 1 },
  name: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  state: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginTop: 1 },
  stateWaiting: { color: color.role.driver.accentDark, fontWeight: "600" },
  rule: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500] },
});
