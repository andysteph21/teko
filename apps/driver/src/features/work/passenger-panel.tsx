// Feuille basse D-11 / D-11b — fiche passager minimale (le backend n'expose
// ni nom ni téléphone au chauffeur : « Votre passager » + indication C-09),
// « Je suis arrivé », puis attente : compte à rebours 5 min avant « Passager
// absent » et CTA « Demander le code ».

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button } from "@teko/ui/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

/** Délai avant annulation sans pénalité (question ouverte n° 5 : 5 min). */
export const NO_SHOW_WAIT_S = 300;

export interface PassengerPanelProps {
  status: "accepted" | "enroute" | "arrived";
  originHint: string | null;
  /** Base du compte à rebours — updated_at de la ligne au passage arrived. */
  arrivedAt: string | null;
  busy: boolean;
  onArrive: () => void;
  onRequestPin: () => void;
  onNoShow: () => void;
}

function mmss(totalS: number): string {
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useNoShowCountdown(arrivedAt: string | null): number {
  const [remaining, setRemaining] = useState(NO_SHOW_WAIT_S);
  useEffect(() => {
    const compute = () => {
      if (!arrivedAt) return NO_SHOW_WAIT_S;
      const elapsed = Math.floor((Date.now() - Date.parse(arrivedAt)) / 1000);
      return Math.max(0, NO_SHOW_WAIT_S - elapsed);
    };
    setRemaining(compute());
    const timer = setInterval(() => setRemaining(compute()), 1_000);
    return () => clearInterval(timer);
  }, [arrivedAt]);
  return remaining;
}

function PassengerRow({ originHint }: { originHint: string | null }) {
  const { t } = useTranslation();
  return (
    <View style={styles.pax}>
      <View style={styles.avatar}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Circle cx={12} cy={8.5} r={4} stroke={color.brand[800]} strokeWidth={2.2} fill="none" />
          <Path
            d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5"
            stroke={color.brand[800]}
            strokeWidth={2.2}
            fill="none"
          />
        </Svg>
      </View>
      <View style={styles.paxBody}>
        <Text style={styles.paxName}>{t("work:course.votrePassager")}</Text>
        <Text style={styles.paxSub}>
          {originHint ? `« ${originHint} »` : t("work:course.vousAttend")}
        </Text>
      </View>
    </View>
  );
}

function WaitBox({ remaining }: { remaining: number }) {
  const { t } = useTranslation();
  const progress = 1 - remaining / NO_SHOW_WAIT_S;
  return (
    <View style={styles.wait}>
      <View style={styles.waitHead}>
        <Text style={styles.waitLabel}>{t("work:course.attentePassager")}</Text>
        <Text style={styles.waitTimer} testID="noshow-countdown">
          {mmss(remaining)}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={styles.waitHint}>{t("work:course.attenteAide")}</Text>
    </View>
  );
}

export function PassengerPanel(props: PassengerPanelProps) {
  const { status, originHint, arrivedAt, busy, onArrive, onRequestPin, onNoShow } = props;
  const { t } = useTranslation();
  const remaining = useNoShowCountdown(arrivedAt);
  const waiting = status === "arrived";
  const noShowReady = waiting && remaining <= 0;

  return (
    <BottomPanel style={styles.panel}>
      <PassengerRow originHint={originHint} />
      {waiting ? (
        <>
          <WaitBox remaining={remaining} />
          <Button
            label={t("work:course.demanderCode")}
            accent="driver"
            busy={busy}
            onPress={onRequestPin}
            testID="ride-request-pin"
          />
          <Pressable
            style={[styles.noShow, !noShowReady && styles.noShowDisabled]}
            disabled={!noShowReady || busy}
            onPress={onNoShow}
            accessibilityRole="button"
            accessibilityState={{ disabled: !noShowReady || busy }}
            testID="ride-noshow"
          >
            <Text style={[styles.noShowText, noShowReady && styles.noShowTextReady]}>
              {noShowReady
                ? t("work:course.passagerAbsent")
                : t("work:course.passagerAbsentDans", { duree: mmss(remaining) })}
            </Text>
          </Pressable>
        </>
      ) : (
        <Button
          label={t("work:course.jeSuisArrive")}
          accent="driver"
          busy={busy}
          onPress={onArrive}
          testID="ride-arrive"
        />
      )}
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  panel: { position: "absolute", left: 0, right: 0, bottom: 0 },
  pax: { flexDirection: "row", alignItems: "center", gap: spacing[3], marginBottom: spacing[3] },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  paxBody: { flex: 1 },
  paxName: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  paxSub: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginTop: 1 },
  wait: {
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  waitHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  waitLabel: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  waitTimer: {
    fontFamily: typography.fontFamily.mono,
    fontWeight: "900",
    color: color.role.driver.accentDark,
    fontVariant: ["tabular-nums"],
  },
  bar: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[200],
    overflow: "hidden",
  },
  barFill: { height: 6, backgroundColor: color.role.driver.accent },
  waitHint: {
    fontSize: typography.fontSize.xs + 1,
    color: color.neutral[500],
    marginTop: spacing[2],
  },
  noShow: {
    height: 44,
    borderRadius: borderRadius.xl,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[2],
  },
  noShowDisabled: { opacity: 0.75 },
  noShowText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[400] },
  noShowTextReady: { color: color.semantic.error.default },
});
