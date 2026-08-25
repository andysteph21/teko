// Modal D-10 « Nouvelle demande » par-dessus D-09 — compte à rebours animé
// depuis expires_at, course/commission/net (net EN GRAND), point de rencontre
// + indication du client. JAMAIS la destination avant acceptation
// (anti-écrémage, décision n° 9 — la maquette D-10 antérieure la montrait).

import type { OfferDetails } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { fetchRoute } from "@teko/maps";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { VALHALLA_URL } from "../../config";
import { fetchDevicePosition } from "./use-device-position";

export interface OfferModalProps {
  offer: OfferDetails;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onExpire: () => void;
}

function remainingMs(expiresAt: string): number {
  return Math.max(0, Date.parse(expiresAt) - Date.now());
}

/** Secondes restantes, tic 250 ms ; déclenche onExpire une seule fois à 0. */
function useCountdown(expiresAt: string, onExpire: () => void): number {
  const [seconds, setSeconds] = useState(() => Math.ceil(remainingMs(expiresAt) / 1000));
  const expired = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  useEffect(() => {
    const timer = setInterval(() => {
      const ms = remainingMs(expiresAt);
      setSeconds(Math.ceil(ms / 1000));
      if (ms <= 0 && !expired.current) {
        expired.current = true;
        expireRef.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return seconds;
}

/** ETA de prise en charge (position → point de rencontre), meilleure volonté. */
function usePickupEta(offer: OfferDetails): number | null {
  const [etaMin, setEtaMin] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const from = await fetchDevicePosition();
      if (!from) return;
      const route = await fetchRoute(VALHALLA_URL, from, offer.origin).catch(() => null);
      if (route && !cancelled) setEtaMin(Math.max(1, Math.round(route.durationS / 60)));
    })();
    return () => {
      cancelled = true;
    };
  }, [offer]);
  return etaMin;
}

function CountBar({ expiresAt }: { expiresAt: string }) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: remainingMs(expiresAt),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expiresAt, progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

function OfferStats({ offer }: { offer: OfferDetails }) {
  const { t } = useTranslation();
  return (
    <View style={styles.stats}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{formatXaf(offer.priceEst)}</Text>
        <Text style={styles.statLabel}>{t("work:offre.course")}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{formatXaf(-offer.commission)}</Text>
        <Text style={styles.statLabel}>{t("work:offre.commission")}</Text>
      </View>
      <View style={[styles.stat, styles.statNet]}>
        <Text style={styles.netValue} testID="offer-net">
          {formatXaf(offer.netDriver)}
        </Text>
        <Text style={styles.statLabel}>{t("work:offre.net")}</Text>
      </View>
    </View>
  );
}

export function OfferModal({ offer, busy, onAccept, onDecline, onExpire }: OfferModalProps) {
  const { t } = useTranslation();
  const seconds = useCountdown(offer.expiresAt, onExpire);
  const etaMin = usePickupEta(offer);
  const km = (offer.distanceEstM / 1000).toFixed(1).replace(".", ",");
  const courseMin = Math.max(1, Math.round(offer.durationEstS / 60));

  return (
    <View style={styles.overlay} pointerEvents="box-none" testID="offer-modal">
      <View style={styles.scrim} />
      <View style={styles.modal}>
        <CountBar expiresAt={offer.expiresAt} />
        <View style={styles.head}>
          <Text style={styles.title}>
            {t("work:offre.titre", { categorie: t(`work:categories.${offer.category}`) })}
          </Text>
          <Text style={styles.timer} testID="offer-timer">
            {t("work:offre.secondes", { s: seconds })}
          </Text>
        </View>
        <View style={styles.meet}>
          <View style={styles.meetDot} />
          <View style={styles.meetBody}>
            <Text style={styles.meetTitle}>
              {offer.meetingLandmark ?? offer.originLandmark ?? t("work:offre.pointRencontre")}
            </Text>
            {etaMin !== null ? (
              <Text style={styles.meetSub}>{t("work:offre.priseEnCharge", { min: etaMin })}</Text>
            ) : null}
            {offer.originHint ? (
              <Text style={styles.meetHint}>
                {t("work:offre.indication", { hint: offer.originHint })}
              </Text>
            ) : null}
          </View>
        </View>
        <OfferStats offer={offer} />
        <Text style={styles.distance}>{t("work:offre.distanceDuree", { km, min: courseMin })}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.refuse}
            onPress={onDecline}
            accessibilityRole="button"
            testID="offer-refuse"
          >
            <Text style={styles.refuseText}>{t("work:offre.refuser")}</Text>
          </Pressable>
          <View style={styles.acceptWrap}>
            <Button
              label={t("work:offre.accepter")}
              accent="driver"
              busy={busy}
              onPress={onAccept}
              testID="offer-accept"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "flex-end",
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
    marginBottom: 18,
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.xl,
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: "hidden",
  },
  track: {
    height: 6,
    backgroundColor: color.neutral[100],
    marginHorizontal: -18,
    marginBottom: 14,
  },
  fill: { height: 6, backgroundColor: color.role.driver.accent },
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
  meet: { flexDirection: "row", gap: spacing[3], marginBottom: spacing[3] },
  meetDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[500],
    marginTop: 6,
  },
  meetBody: { flex: 1 },
  meetTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  meetSub: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginTop: 2 },
  meetHint: { fontSize: typography.fontSize.sm, color: color.neutral[600], marginTop: spacing[1] },
  stats: { flexDirection: "row", gap: spacing[2], marginBottom: spacing[3] },
  stat: {
    flex: 1,
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    paddingVertical: 9,
    alignItems: "center",
  },
  statNet: { backgroundColor: color.semantic.success.light },
  statValue: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  netValue: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.lg,
    fontWeight: "900",
    color: color.semantic.success.dark,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 10,
    color: color.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    marginTop: 1,
  },
  distance: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginBottom: spacing[3],
  },
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
