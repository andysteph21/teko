// Panneaux C-13 (chauffeur en approche) et C-13b (chauffeur arrivé) — le PIN
// se communique de vive voix, jamais par le réseau (parcours G-J §synchro).
// Écart maquette consigné : note ★, véhicule, plaque et bouton d'appel absents
// tant que le backend n'expose pas de fiche chauffeur aux participants (RLS
// profiles self-only) ni d'appel relayé.

import { color, spacing, typography } from "@teko/ui";
import { BottomPanel, DriverCard } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function initialsOf(name: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed === "" ? "•" : trimmed.charAt(0).toUpperCase();
}

/** Réserve l'inset bas : sans lui, l'annulation passe sous la barre système
 * (bounds accessibilité [0,0] → taps avalés par home/recents, vécu OPPO A15). */
function usePanelInsetStyle() {
  const insets = useSafeAreaInsets();
  return { paddingBottom: insets.bottom + spacing[5] };
}

export interface PinPanelProps {
  driverName: string | null;
  pin: string | null;
  etaMin: number | null;
  onCancel: () => void;
}

/** C-13 — fiche chauffeur, ETA, PIN 34 px, annulation gratuite. */
export function ApproachPanel({ driverName, pin, etaMin, onCancel }: PinPanelProps) {
  const { t } = useTranslation();
  const insetStyle = usePanelInsetStyle();
  const title = driverName
    ? t("ride:suivi.titreApproche", { name: driverName })
    : t("ride:suivi.titreApprocheSansNom");
  return (
    <BottomPanel style={insetStyle} testID="ride-panel">
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {etaMin !== null ? (
          <Text style={styles.badge} testID="ride-eta">
            {t("ride:suivi.etaMin", { min: etaMin })}
          </Text>
        ) : null}
      </View>
      <DriverCard
        name={driverName ?? t("ride:suivi.chauffeurFallback")}
        initials={initialsOf(driverName)}
        detail={t("ride:suivi.enRouteVersVous")}
        testID="driver-card"
      />
      <View style={styles.pinZone}>
        <Text style={styles.pinLabel}>{t("ride:suivi.pinLabel")}</Text>
        <Text style={styles.pin} testID="ride-pin">
          {pin ?? "····"}
        </Text>
        <Text style={styles.pinHelp}>{t("ride:suivi.pinAide")}</Text>
      </View>
      <Pressable
        onPress={onCancel}
        style={styles.cancel}
        hitSlop={spacing[2]}
        accessibilityRole="button"
        testID="ride-cancel"
      >
        <Text style={styles.cancelText}>{t("ride:suivi.annuler")}</Text>
      </Pressable>
    </BottomPanel>
  );
}

/** C-13b — bandeau « arrivé », PIN énorme (56 px), frais d'annulation possibles. */
export function ArrivedPanel({ driverName, pin, onCancel }: Omit<PinPanelProps, "etaMin">) {
  const { t } = useTranslation();
  const insetStyle = usePanelInsetStyle();
  const title = driverName
    ? t("ride:suivi.arriveTitre", { name: driverName })
    : t("ride:suivi.arriveTitreSansNom");
  const help = driverName
    ? t("ride:suivi.pinAideArrive", { name: driverName })
    : t("ride:suivi.pinAideArriveSansNom");
  return (
    <BottomPanel style={insetStyle} testID="ride-panel">
      <View style={styles.arrivedBanner} testID="arrived-banner">
        <Text style={styles.arrivedCheck}>✓</Text>
        <View>
          <Text style={styles.arrivedTitle}>{title}</Text>
          <Text style={styles.arrivedSub}>{t("ride:suivi.arriveSous")}</Text>
        </View>
      </View>
      <View style={styles.pinZoneBig}>
        <Text style={styles.pinLabel}>{t("ride:suivi.pinLabelArrive")}</Text>
        <Text style={styles.pinBig} testID="ride-pin">
          {pin ?? "····"}
        </Text>
        <Text style={styles.pinHelp}>{help}</Text>
      </View>
      <Pressable
        onPress={onCancel}
        style={styles.cancel}
        hitSlop={spacing[2]}
        accessibilityRole="button"
        testID="ride-cancel"
      >
        <Text style={styles.cancelText}>{t("ride:suivi.annulerFrais")}</Text>
      </Pressable>
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  title: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.brand[900] },
  badge: {
    fontSize: typography.fontSize.sm,
    fontWeight: "700",
    color: color.brand[800],
    backgroundColor: color.brand[50],
    borderRadius: 9999,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    overflow: "hidden",
    fontVariant: ["tabular-nums"],
  },
  pinZone: { alignItems: "center", paddingTop: spacing[3], paddingBottom: spacing[1] },
  pinZoneBig: {
    alignItems: "center",
    paddingVertical: spacing[3],
    backgroundColor: color.neutral[50],
    borderRadius: 16,
    marginBottom: spacing[2],
  },
  pinLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginBottom: spacing[1],
  },
  pin: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 10,
    color: color.brand[900],
    fontVariant: ["tabular-nums"],
  },
  pinBig: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "900",
    letterSpacing: 14,
    color: color.brand[900],
    fontVariant: ["tabular-nums"],
  },
  pinHelp: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginTop: spacing[1],
    textAlign: "center",
    paddingHorizontal: spacing[4],
  },
  arrivedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: color.semantic.success.light,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: spacing[3],
  },
  arrivedCheck: {
    color: color.semantic.success.default,
    fontSize: typography.fontSize.md,
    fontWeight: "900",
  },
  arrivedTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.semantic.success.dark,
  },
  arrivedSub: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  cancel: { alignSelf: "center", padding: spacing[2], marginTop: spacing[1] },
  cancelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.semantic.error.default,
  },
});
