// Fenêtre « Modification du trajet » (lot R3) par-dessus l'écran de course :
// nouvelle destination, arrêts, ancien → nouveau prix, compte à rebours
// jusqu'à respond_by (30 s côté serveur), Accepter / Refuser. Même signal
// d'attention que la proposition D-10 (vibration reprise + annonce vocale) et
// même grâce d'expiration (actions désarmées avant fermeture).

import type { RouteChange } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OFFER_VIBRATION } from "../../lib/offer-alert";
import { announce, silence } from "../../lib/voice";
import { CountBar } from "./count-bar";
import { changeStopsCount } from "./route-change";
import { useOfferCountdown } from "./use-offer-countdown";
import { routeChangePhrase } from "./voice-phrases";

export interface RouteChangeModalProps {
  change: RouteChange;
  /** Nom du repère de destination, quand il est connu. */
  destinationName: string | null;
  busy: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onExpire: () => void;
}

function Prices({ change }: { change: RouteChange }) {
  const { t } = useTranslation();
  return (
    <View style={styles.prices}>
      <View style={styles.price}>
        <Text style={styles.oldValue} testID="route-change-old-price">
          {formatXaf(Number(change.old_price), "FCFA")}
        </Text>
        <Text style={styles.priceLabel}>{t("work:modif.ancienPrix")}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
      <View style={[styles.price, styles.priceNew]}>
        <Text style={styles.newValue} testID="route-change-new-price">
          {formatXaf(Number(change.new_price), "FCFA")}
        </Text>
        <Text style={styles.priceLabel}>{t("work:modif.nouveauPrix")}</Text>
      </View>
    </View>
  );
}

function Destination({ change, name }: { change: RouteChange; name: string | null }) {
  const { t } = useTranslation();
  const stops = changeStopsCount(change);
  return (
    <View style={styles.dest}>
      <Text style={styles.destLabel}>{t("work:modif.nouvelleDestination")}</Text>
      <Text style={styles.destName} testID="route-change-destination">
        {name ?? change.dest_hint ?? t("work:modif.destinationInconnue")}
      </Text>
      {name && change.dest_hint && change.dest_hint !== name ? (
        <Text style={styles.destHint}>{t("work:modif.precision", { hint: change.dest_hint })}</Text>
      ) : null}
      <Text style={styles.stops} testID="route-change-stops">
        {stops > 0 ? t("work:modif.arrets", { count: stops }) : t("work:modif.sansArret")}
      </Text>
    </View>
  );
}

export function RouteChangeModal(props: RouteChangeModalProps) {
  const { change, destinationName, busy, onAccept, onRefuse, onExpire } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const respondBy = change.respond_by ?? change.expires_at;
  const { seconds, expired } = useOfferCountdown(respondBy, busy, onExpire);
  const ringing = !expired && !busy;

  useEffect(() => {
    announce(
      routeChangePhrase({
        destination: destinationName,
        hint: change.dest_hint,
        stops: changeStopsCount(change),
        newPrice: Number(change.new_price),
      }),
    );
    return () => silence();
  }, [change, destinationName]);
  useEffect(() => {
    if (!ringing) return;
    Vibration.vibrate(OFFER_VIBRATION, true);
    return () => Vibration.cancel();
  }, [ringing]);

  return (
    <View style={styles.overlay} pointerEvents="box-none" testID="route-change-modal">
      <View style={styles.scrim} />
      <View
        style={[styles.modal, { marginBottom: 18 + insets.bottom }]}
        testID="route-change-sheet"
      >
        <CountBar expiresAt={respondBy} />
        <View style={styles.head}>
          <Text style={styles.title}>{t("work:modif.titre")}</Text>
          <Text style={styles.timer} testID="route-change-timer">
            {t("work:offre.secondes", { s: seconds })}
          </Text>
        </View>
        <Destination change={change} name={destinationName} />
        <Prices change={change} />
        <Text style={styles.help}>{t("work:modif.aide")}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.refuse}
            onPress={onRefuse}
            disabled={expired || busy}
            accessibilityRole="button"
            testID="route-change-refuse"
          >
            <Text style={styles.refuseText}>{t("work:modif.refuser")}</Text>
          </Pressable>
          <View style={styles.acceptWrap}>
            <Button
              label={t("work:modif.accepter")}
              accent="driver"
              busy={busy}
              disabled={expired}
              onPress={onAccept}
              testID="route-change-accept"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Au-dessus du widget de données et des panneaux (même règle que D-10).
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "flex-end",
    zIndex: 20,
    elevation: 20,
  },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,15,30,0.45)",
  },
  modal: {
    marginHorizontal: 14,
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.xl,
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: "hidden",
  },
  head: { flexDirection: "row", alignItems: "center", marginBottom: spacing[3] },
  title: { flex: 1, fontSize: typography.fontSize.md, fontWeight: "700", color: color.brand[900] },
  timer: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.md,
    fontWeight: "900",
    color: color.role.driver.accentDark,
    backgroundColor: color.role.driver.accentLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    fontVariant: ["tabular-nums"],
  },
  dest: { marginBottom: spacing[3] },
  destLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[500],
  },
  destName: {
    fontSize: typography.fontSize.base,
    fontWeight: "600",
    color: color.neutral[700],
    marginTop: 2,
  },
  destHint: { fontSize: typography.fontSize.sm, color: color.neutral[600], marginTop: 2 },
  stops: { fontSize: typography.fontSize.sm, color: color.neutral[500], marginTop: spacing[1] },
  prices: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  price: {
    flex: 1,
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    paddingVertical: 9,
    alignItems: "center",
  },
  priceNew: { backgroundColor: color.semantic.success.light },
  oldValue: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.neutral[500],
    textDecorationLine: "line-through",
    fontVariant: ["tabular-nums"],
  },
  newValue: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.lg,
    fontWeight: "900",
    color: color.semantic.success.dark,
    fontVariant: ["tabular-nums"],
  },
  priceLabel: {
    fontSize: 10,
    color: color.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    marginTop: 1,
  },
  arrow: { fontSize: typography.fontSize.md, color: color.neutral[400] },
  help: { fontSize: typography.fontSize.sm, color: color.neutral[500], marginBottom: spacing[3] },
  actions: { flexDirection: "row", gap: spacing[2], alignItems: "center" },
  refuse: {
    width: 100,
    height: spacing[12],
    borderRadius: borderRadius.xl,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  refuseText: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[600] },
  acceptWrap: { flex: 1 },
});
